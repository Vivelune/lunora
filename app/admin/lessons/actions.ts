"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type LessonFormState = { ok: boolean; message: string | null };

const fail = (message: string): LessonFormState => ({ ok: false, message });

const lessonSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150, "Title is too long (150 maximum)"),
  description: z.string().trim().max(500, "Description is too long (500 maximum)"),
  subjectId: z.string().min(1, "Choose a subject"),
  categoryId: z.string(),
  objectives: z.string().max(4000, "Objectives are too long"),
  content: z.string().max(50000, "Content is too long (50,000 characters maximum)"),
  estimatedMinutes: z.string().trim(),
});

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

export async function saveLesson(
  _previous: LessonFormState,
  formData: FormData
): Promise<LessonFormState> {
  const { profile } = await requireAdmin();

  const lessonId = text(formData, "id");

  const parsed = lessonSchema.safeParse({
    title: text(formData, "title"),
    description: text(formData, "description"),
    subjectId: text(formData, "subjectId"),
    categoryId: text(formData, "categoryId"),
    objectives: text(formData, "objectives"),
    content: text(formData, "content"),
    estimatedMinutes: text(formData, "estimatedMinutes"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message);
  }
  const data = parsed.data;

  const objectives = data.objectives
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (objectives.length > 10) {
    return fail("Use at most 10 learning objectives");
  }
  if (objectives.some((line) => line.length > 200)) {
    return fail("Each learning objective must be 200 characters or fewer");
  }

  let estimatedMinutes: number | null = null;
  if (data.estimatedMinutes !== "") {
    const minutes = Number(data.estimatedMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
      return fail("Estimated time must be a whole number between 1 and 600 minutes");
    }
    estimatedMinutes = minutes;
  }

  const subject = await prisma.subject.findFirst({
    where: { id: data.subjectId, isActive: true, children: { none: {} } },
    select: { id: true },
  });
  if (!subject) {
    return fail("Choose a valid subject");
  }

  let categoryId: string | null = null;
  if (data.categoryId !== "") {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, subjectId: data.subjectId, isActive: true },
      select: { id: true },
    });
    if (!category) {
      return fail("That category does not belong to the selected subject");
    }
    categoryId = category.id;
  }

  const fields = {
    title: data.title,
    description: data.description === "" ? null : data.description,
    subjectId: data.subjectId,
    categoryId,
    objectives,
    content: data.content,
    estimatedMinutes,
  };

  if (!lessonId) {
    let createdId: string | null = null;
    try {
      const created = await prisma.lesson.create({
        data: { ...fields, createdById: profile.id },
        select: { id: true },
      });
      createdId = created.id;
    } catch (error) {
      console.error("saveLesson (create) failed:", error instanceof Error ? error.name : "unknown");
      return fail("Could not save the lesson. Please try again.");
    }
    revalidatePath("/admin/lessons");
    redirect(`/admin/lessons/${createdId}?saved=Lesson+created+as+a+draft`);
  }

  try {
    await prisma.lesson.update({ where: { id: lessonId }, data: fields });
  } catch (error) {
    if (errorCode(error) === "P2025") {
      return fail("That lesson no longer exists");
    }
    console.error("saveLesson (update) failed:", error instanceof Error ? error.name : "unknown");
    return fail("Could not save the lesson. Please try again.");
  }

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/lessons/${lessonId}`);
  return { ok: true, message: "Saved" };
}

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export async function setLessonStatus(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ id: z.string().min(1), to: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) })
    .safeParse({ id: text(formData, "id"), to: text(formData, "to") });
  if (!parsed.success) {
    redirect("/admin/lessons");
  }
  const { id, to } = parsed.data;
  const base = `/admin/lessons/${id}`;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { status: true, title: true, content: true, publishedAt: true },
  });
  if (!lesson) {
    redirect("/admin/lessons");
  }

  if (!TRANSITIONS[lesson.status]?.includes(to)) {
    redirect(`${base}?error=${encodeURIComponent("That status change is not allowed")}`);
  }
    // Do not strand students: block taking a lesson offline while someone still
  // needs it as a REQUIRED item in an unfinished, active assignment.
  if (lesson.status === "PUBLISHED" && to !== "PUBLISHED") {
    const stranded = await prisma.lessonPlanAssignment.count({
      where: {
        status: "ACTIVE",
        completedAt: null,
        version: { items: { some: { lessonId: id, isRequired: true } } },
      },
    });
    if (stranded > 0) {
      redirect(
        `${base}?error=${encodeURIComponent(
          `${stranded} student${stranded === 1 ? " is" : "s are"} still working on a plan that requires this lesson. Move them to a newer plan version or cancel their assignments first.`
        )}`
      );
    }
  }

  if (to === "PUBLISHED") {
    if (lesson.title.trim() === "" || lesson.content.trim() === "") {
      redirect(`${base}?error=${encodeURIComponent("Add content before publishing")}`);
    }
  }

  // The "where status" condition makes this safe if two admins click at once.
  const result = await prisma.lesson.updateMany({
    where: { id, status: lesson.status },
    data: {
      status: to,
      ...(to === "PUBLISHED" && !lesson.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });
  if (result.count === 0) {
    redirect(`${base}?error=${encodeURIComponent("The lesson changed. Reload and try again")}`);
  }

  revalidatePath("/admin/lessons");
  revalidatePath(base);
  redirect(`${base}?saved=${encodeURIComponent(`Status is now ${to.toLowerCase()}`)}`);
}