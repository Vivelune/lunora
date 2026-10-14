"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { parseDay } from "@/lib/assignments";
import { validateSettings } from "@/lib/exam-settings";
import prisma  from "@/lib/prisma";

export type ExamFormState = { ok: boolean; message: string | null };

const examUrl = (id: string) => `/admin/exams/${id}`;

function go(path: string, kind: "error" | "saved", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const titleSchema = z.string().trim().min(1, "Title is required").max(150, "Title is too long (150 maximum)");
const descriptionSchema = z.string().trim().max(1000, "Description is too long (1000 maximum)");

export async function createExam(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({ title: titleSchema, description: descriptionSchema, subjectId: z.string().min(1, "Choose a subject") })
    .safeParse({
      title: str(formData, "title"),
      description: str(formData, "description"),
      subjectId: str(formData, "subjectId"),
    });
  if (!parsed.success) {
    go("/admin/exams/new", "error", parsed.error.issues[0].message);
  }

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.data.subjectId, isActive: true, children: { none: {} } },
    select: { id: true },
  });
  if (!subject) {
    go("/admin/exams/new", "error", "Choose a valid subject");
  }

  let examId: string | null = null;
  try {
    const exam = await prisma.exam.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description === "" ? null : parsed.data.description,
        subjectId: subject.id,
        createdById: profile.id,
        versions: { create: { versionNumber: 1 } },
      },
      select: { id: true },
    });
    examId = exam.id;
  } catch (error) {
    console.error("createExam failed:", error instanceof Error ? error.name : "unknown");
    go("/admin/exams/new", "error", "Could not create the exam. Please try again.");
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "exam.create",
    entityType: "Exam",
    entityId: examId as string,
  });

  revalidatePath("/admin/exams");
  go(examUrl(examId as string), "saved", "Exam created. Review the settings below.");
}

export async function updateExamDetails(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({
      id: z.string().min(1),
      title: titleSchema,
      description: descriptionSchema,
      categoryId: z.string(),
      availableFrom: z.string(),
      availableUntil: z.string(),
      visibility: z.enum(["ASSIGNED_ONLY", "OPEN_PRACTICE"], { message: "Choose who can find this exam" }),
    })
    .safeParse({
      id: str(formData, "id"),
      title: str(formData, "title"),
      description: str(formData, "description"),
      categoryId: str(formData, "categoryId"),
      availableFrom: str(formData, "availableFrom"),
      availableUntil: str(formData, "availableUntil"),
      visibility: str(formData, "visibility"),
    });
  if (!parsed.success) {
    go("/admin/exams", "error", parsed.error.issues[0].message);
  }
  const data = parsed.data;
  const base = examUrl(data.id);

  const exam = await prisma.exam.findUnique({ where: { id: data.id }, select: { subjectId: true } });
  if (!exam) {
    go("/admin/exams", "error", "That exam no longer exists");
  }

  let categoryId: string | null = null;
  if (data.categoryId !== "") {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, subjectId: exam.subjectId, isActive: true },
      select: { id: true },
    });
    if (!category) {
      go(base, "error", "That category does not belong to this exam's subject");
    }
    categoryId = category.id;
  }

  const from = parseDay(data.availableFrom, false);
  const until = parseDay(data.availableUntil, true);
  if (!from.ok) {
    go(base, "error", "The availability start date is not valid");
  }
  if (!until.ok) {
    go(base, "error", "The availability end date is not valid");
  }
  if (from.date && until.date && until.date.getTime() < from.date.getTime()) {
    go(base, "error", "The availability end cannot be before its start");
  }

  try {
    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description === "" ? null : data.description,
        categoryId,
        availableFrom: from.date,
        availableUntil: until.date,
        visibility: data.visibility,
      },
    });
  } catch (error) {
    console.error("updateExamDetails failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not save the exam. Please try again.");
  }

  revalidatePath("/admin/exams");
  revalidatePath(base);
  go(base, "saved", "Exam details saved");
}

export async function saveExamSettings(
  _previous: ExamFormState,
  formData: FormData
): Promise<ExamFormState> {
  await requireAdmin();

  const examId = str(formData, "examId");
  if (!examId) {
    return { ok: false, message: "Invalid request" };
  }

  const result = validateSettings({
    instructions: str(formData, "instructions"),
    durationMinutes: str(formData, "durationMinutes"),
    maxAttempts: str(formData, "maxAttempts"),
    passingPercent: str(formData, "passingPercent"),
    shuffleQuestions: formData.get("shuffleQuestions") === "on",
    shuffleOptions: formData.get("shuffleOptions") === "on",
    resultRelease: str(formData, "resultRelease"),
    explanationRelease: str(formData, "explanationRelease"),
    focusPolicy: str(formData, "focusPolicy"),
    maxFocusViolations: str(formData, "maxFocusViolations"),
    requireFullscreen: formData.get("requireFullscreen") === "on",
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  try {
    // Only the unpublished working copy can change. Published versions are frozen.
    const updated = await prisma.examVersion.updateMany({
      where: { examId, publishedAt: null },
      data: result.data,
    });
    if (updated.count === 0) {
      return { ok: false, message: "There is no editable version. Published versions cannot be changed." };
    }
  } catch (error) {
    console.error("saveExamSettings failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, message: "Could not save the settings. Please try again." };
  }

  revalidatePath("/admin/exams");
  revalidatePath(examUrl(examId));
  return { ok: true, message: "Settings saved" };
}

export async function setExamArchived(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({ examId: z.string().min(1), archive: z.enum(["true", "false"]) })
    .safeParse({ examId: str(formData, "examId"), archive: str(formData, "archive") });
  if (!parsed.success) {
    go("/admin/exams", "error", "Invalid request");
  }
  const { examId } = parsed.data;
  const archiving = parsed.data.archive === "true";
  const base = examUrl(examId);

  try {
    // Restoring returns an exam to DRAFT for now. Step 9.4 refines this once publishing exists.
    await prisma.exam.update({
      where: { id: examId },
      data: { status: archiving ? "ARCHIVED" : "DRAFT" },
    });
  } catch (error) {
    console.error("setExamArchived failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not update the exam. Please try again.");
  }

  await writeAuditLog({
    actorId: profile.id,
    action: archiving ? "exam.archive" : "exam.restore",
    entityType: "Exam",
    entityId: examId,
  });

  revalidatePath("/admin/exams");
  revalidatePath(base);
  go(base, "saved", archiving ? "Exam archived" : "Exam restored as a draft");
}