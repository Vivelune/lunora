"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { formParams, readInput, resolveAssignment } from "@/lib/assignments";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createAssignments(formData: FormData) {
  const { profile } = await requireAdmin();
  const get = (key: string) => str(formData, key);

  const back = (message: string, preview: boolean): never => {
    const params = formParams(get);
    if (preview) params.set("preview", "1");
    params.set("error", message);
    redirect(`/admin/assignments/new?${params.toString()}`);
  };

  const parsed = readInput(get);
  if (!parsed.success) {
    back(parsed.error.issues[0].message, false);
  }
  const input = parsed.data!;

  const resolved = await resolveAssignment(input);
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
    back("Nobody to assign: everyone selected already has this plan", false);
  }

  const priority = input.priority;
  let created = 0;
  try {
    const result = await prisma.lessonPlanAssignment.createMany({
      data: plan.newStudents.map((student) => ({
        planId: plan.planId,
        versionId: plan.versionId,
        studentId: student.id,
        groupId: plan.groupId,
        startDate: plan.startDate,
        dueDate: plan.dueDate,
        priority,
        instructions: input.instructions === "" ? null : input.instructions,
        createdById: profile.id,
      })),
      skipDuplicates: true,
    });
    created = result.count;
  } catch (error) {
    console.error("createAssignments failed:", error instanceof Error ? error.name : "unknown");
    back("Could not save the assignments. Nothing was changed. Please try again.", false);
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "assignment.bulk_create",
    entityType: "LessonPlan",
    entityId: plan.planId,
    details: {
      targetType: input.targetType,
      groupId: plan.groupId,
      versionNumber: plan.versionNumber,
      requested: plan.allTargets,
      created,
      skippedExisting: plan.skippedCount,
    },
  });

  revalidatePath("/admin/assignments");
  const skipped = plan.skippedCount > 0 ? ` (${plan.skippedCount} already had this plan)` : "";
  redirect(
    `/admin/assignments?saved=${encodeURIComponent(`Assigned to ${created} student${created === 1 ? "" : "s"}${skipped}`)}`
  );
}

export async function setAssignmentStatus(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({ id: z.string().min(1), to: z.enum(["ACTIVE", "CANCELLED"]) })
    .safeParse({ id: str(formData, "id"), to: str(formData, "to") });
  if (!parsed.success) {
    redirect(`/admin/assignments?error=${encodeURIComponent("Invalid request")}`);
  }
  const { id, to } = parsed.data;

  const assignment = await prisma.lessonPlanAssignment.findUnique({
    where: { id },
    select: { status: true, completedAt: true, planId: true, studentId: true },
  });
  if (!assignment) {
    redirect(`/admin/assignments?error=${encodeURIComponent("That assignment no longer exists")}`);
  }
  if (to === "CANCELLED" && assignment.completedAt) {
    redirect(`/admin/assignments?error=${encodeURIComponent("Completed assignments cannot be cancelled")}`);
  }

  if (assignment.status !== to) {
    await prisma.lessonPlanAssignment.update({ where: { id }, data: { status: to } });
    await writeAuditLog({
      actorId: profile.id,
      action: to === "CANCELLED" ? "assignment.cancel" : "assignment.restore",
      entityType: "LessonPlanAssignment",
      entityId: id,
      details: { planId: assignment.planId, studentId: assignment.studentId },
    });
  }

  revalidatePath("/admin/assignments");
  redirect(
    `/admin/assignments?saved=${encodeURIComponent(to === "CANCELLED" ? "Assignment cancelled" : "Assignment restored")}`
  );
}