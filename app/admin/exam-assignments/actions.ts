"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { parseDay } from "@/lib/assignments";
import { examFormParams, parseAttemptsOverride, readExamInput, resolveExamAssignment } from "@/lib/exam-assignments";
import prisma from "@/lib/prisma";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function go(path: string, kind: "error" | "saved", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

export async function createExamAssignments(formData: FormData) {
  const { profile } = await requireAdmin();
  const get = (key: string) => str(formData, key);

  const back = (message: string, preview: boolean): never => {
    const params = examFormParams(get);
    if (preview) params.set("preview", "1");
    params.set("error", message);
    redirect(`/admin/exam-assignments/new?${params.toString()}`);
  };

  const parsed = readExamInput(get);
  if (!parsed.success) {
    back(parsed.error.issues[0].message, false);
  }
  const input = parsed.data!;

  const resolved = await resolveExamAssignment(input);
  if (!resolved.ok) {
    back(resolved.message, false);
  }
  const plan = resolved as Extract<typeof resolved, { ok: true }>;

  if (input.targetType === "all" && get("confirmAll") !== "yes") {
    back("Tick the confirmation box to assign to all students", true);
  }

  const expected = Number(get("expectedCount"));
  if (!Number.isInteger(expected) || expected !== plan.newStudents.length) {
    back(
      `The number of students changed (you saw ${Number.isInteger(expected) ? expected : "?"}, now ${plan.newStudents.length}). Review and confirm again.`,
      true
    );
  }
  if (plan.newStudents.length === 0) {
    back("Nobody to assign: everyone selected already has this exam", false);
  }

  let created = 0;
  try {
    const result = await prisma.examAssignment.createMany({
      data: plan.newStudents.map((student) => ({
        examId: plan.examId,
        versionId: plan.versionId,
        studentId: student.id,
        groupId: plan.groupId,
        availableFrom: plan.availableFrom,
        dueDate: plan.dueDate,
        maxAttemptsOverride: plan.attemptsOverride,
        instructions: input.instructions === "" ? null : input.instructions,
        createdById: profile.id,
      })),
      skipDuplicates: true,
    });
    created = result.count;
  } catch (error) {
    console.error("createExamAssignments failed:", error instanceof Error ? error.name : "unknown");
    back("Could not save the assignments. Nothing was changed. Please try again.", false);
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "exam_assignment.bulk_create",
    entityType: "Exam",
    entityId: plan.examId,
    details: {
      targetType: input.targetType,
      groupId: plan.groupId,
      versionNumber: plan.versionNumber,
      requested: plan.allTargets,
      created,
      skippedExisting: plan.skippedCount,
    },
  });

  revalidatePath("/admin/exam-assignments");
  const skipped = plan.skippedCount > 0 ? ` (${plan.skippedCount} already had this exam)` : "";
  go("/admin/exam-assignments", "saved", `Assigned to ${created} student${created === 1 ? "" : "s"}${skipped}`);
}

export async function setExamAssignmentStatus(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({ id: z.string().min(1), to: z.enum(["ACTIVE", "CANCELLED"]) })
    .safeParse({ id: str(formData, "id"), to: str(formData, "to") });
  if (!parsed.success) {
    go("/admin/exam-assignments", "error", "Invalid request");
  }
  const { id, to } = parsed.data;

  const assignment = await prisma.examAssignment.findUnique({
    where: { id },
    select: { status: true, examId: true, studentId: true },
  });
  if (!assignment) {
    go("/admin/exam-assignments", "error", "That assignment no longer exists");
  }

  if (assignment.status !== to) {
    await prisma.examAssignment.update({ where: { id }, data: { status: to } });
    await writeAuditLog({
      actorId: profile.id,
      action: to === "CANCELLED" ? "exam_assignment.cancel" : "exam_assignment.restore",
      entityType: "ExamAssignment",
      entityId: id,
      details: { examId: assignment.examId, studentId: assignment.studentId },
    });
  }

  revalidatePath("/admin/exam-assignments");
  revalidatePath(`/admin/exam-assignments/${id}`);
  go("/admin/exam-assignments", "saved", to === "CANCELLED" ? "Assignment cancelled" : "Assignment restored");
}

export async function updateExamAssignmentDetails(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({
      id: z.string().min(1),
      availableFrom: z.string(),
      dueDate: z.string(),
      attemptsOverride: z.string(),
      instructions: z.string().trim().max(1000, "Instructions are too long (1000 characters maximum)"),
    })
    .safeParse({
      id: str(formData, "id"),
      availableFrom: str(formData, "availableFrom"),
      dueDate: str(formData, "dueDate"),
      attemptsOverride: str(formData, "attemptsOverride"),
      instructions: str(formData, "instructions"),
    });
  if (!parsed.success) {
    go("/admin/exam-assignments", "error", parsed.error.issues[0].message);
  }
  const data = parsed.data;
  const base = `/admin/exam-assignments/${data.id}`;

  const existing = await prisma.examAssignment.findUnique({
    where: { id: data.id },
    select: { status: true, dueDate: true, exam: { select: { availableUntil: true } } },
  });
  if (!existing) {
    go("/admin/exam-assignments", "error", "That assignment no longer exists");
  }
  if (existing.status !== "ACTIVE") {
    go(base, "error", "Restore the assignment before editing it");
  }

  const from = parseDay(data.availableFrom, false);
  const due = parseDay(data.dueDate, true);
  const attempts = parseAttemptsOverride(data.attemptsOverride);
  if (!from.ok) go(base, "error", "The available-from date is not valid");
  if (!due.ok) go(base, "error", "The due date is not valid");
  if (!attempts.ok) go(base, "error", "The attempt limit must be a whole number from 1 to 20");

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueChanged = (due.date?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null);
  if (dueChanged && due.date && due.date.getTime() < todayUtc) {
    go(base, "error", "The due date cannot be moved into the past");
  }
  if (from.date && due.date && due.date.getTime() < from.date.getTime()) {
    go(base, "error", "The due date cannot be before the available-from date");
  }
  if (due.date && existing.exam.availableUntil && due.date.getTime() > existing.exam.availableUntil.getTime()) {
    go(base, "error", "The due date is after this exam's availability window ends");
  }

  try {
    await prisma.examAssignment.update({
      where: { id: data.id },
      data: {
        availableFrom: from.date,
        dueDate: due.date,
        maxAttemptsOverride: attempts.value,
        instructions: data.instructions === "" ? null : data.instructions,
      },
    });
  } catch (error) {
    console.error("updateExamAssignmentDetails failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not save the changes. Please try again.");
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "exam_assignment.update",
    entityType: "ExamAssignment",
    entityId: data.id,
    details: { dueChanged, attemptsOverride: attempts.value },
  });

  revalidatePath(base);
  revalidatePath("/admin/exam-assignments");
  go(base, "saved", "Assignment updated");
}

export async function moveExamAssignmentToLatest(formData: FormData) {
  const { profile } = await requireAdmin();

  const id = str(formData, "id");
  if (!id) go("/admin/exam-assignments", "error", "Invalid request");
  const base = `/admin/exam-assignments/${id}`;

  const assignment = await prisma.examAssignment.findUnique({
    where: { id },
    select: { status: true, examId: true, versionId: true },
  });
  if (!assignment) {
    go("/admin/exam-assignments", "error", "That assignment no longer exists");
  }
  if (assignment.status !== "ACTIVE") {
    go(base, "error", "Restore the assignment before moving it");
  }

  const latest = await prisma.examVersion.findFirst({
    where: { examId: assignment.examId, publishedAt: { not: null } },
    orderBy: { versionNumber: "desc" },
    select: { id: true, versionNumber: true },
  });
  if (!latest || latest.id === assignment.versionId) {
    go(base, "error", "This assignment is already on the latest published version");
  }

  const result = await prisma.examAssignment.updateMany({
    where: { id, status: "ACTIVE", versionId: assignment.versionId },
    data: { versionId: latest.id },
  });
  if (result.count === 0) {
    go(base, "error", "The assignment changed. Reload and try again.");
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "exam_assignment.move_version",
    entityType: "ExamAssignment",
    entityId: id,
    details: { fromVersionId: assignment.versionId, toVersionNumber: latest.versionNumber },
  });

  revalidatePath(base);
  revalidatePath("/admin/exam-assignments");
  go(base, "saved", `Moved to version ${latest.versionNumber}`);
}