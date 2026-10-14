"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { MAX_QUESTIONS, QUESTION_TYPES, isQuestionType, validateQuestion } from "@/lib/question-input";
import  prisma  from "@/lib/prisma";

export type QuestionFormState = { ok: boolean; message: string | null };

const fail = (message: string): QuestionFormState => ({ ok: false, message });
const examUrl = (id: string) => `/admin/exams/${id}`;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function strings(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === "string");
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

function backToExam(examId: string, kind: "error" | "saved", message: string): never {
  redirect(`${examUrl(examId)}?${kind}=${encodeURIComponent(message)}#questions`);
}

export async function saveQuestion(
  _previous: QuestionFormState,
  formData: FormData
): Promise<QuestionFormState> {
  await requireAdmin();

  const examId = str(formData, "examId");
  const questionId = str(formData, "questionId");
  if (!examId) return fail("Invalid request");

  const version = await prisma.examVersion.findFirst({
    where: { examId, publishedAt: null },
    select: { id: true, exam: { select: { subjectId: true } } },
  });
  if (!version) return fail("This exam has no editable version");

  let type: (typeof QUESTION_TYPES)[number];
  let existingId: string | null = null;

  if (questionId) {
    const existing = await prisma.question.findFirst({
      where: { id: questionId, versionId: version.id },
      select: { id: true, type: true },
    });
    if (!existing) return fail("That question is not in the editable version");
    existingId = existing.id;
    type = existing.type;
  } else {
    const requested = str(formData, "type");
    if (!isQuestionType(requested)) return fail("Choose a question type");
    type = requested;
  }

  const result = validateQuestion({
    type,
    prompt: str(formData, "prompt"),
    points: str(formData, "points"),
    explanation: str(formData, "explanation"),
    optionTexts: strings(formData, "optionText"),
    correctIndexes: strings(formData, "correctIndex"),
    trueFalseCorrect: str(formData, "trueFalseCorrect"),
    acceptedAnswers: str(formData, "acceptedAnswers"),
    imageId: str(formData, "imageId"),
    imageAlt: str(formData, "imageAlt"),
  });
  if (!result.ok) return fail(result.message);
  const data = result.data;

  let categoryId: string | null = null;
  const requestedCategory = str(formData, "categoryId");
  if (requestedCategory !== "") {
    const category = await prisma.category.findFirst({
      where: { id: requestedCategory, subjectId: version.exam.subjectId, isActive: true },
      select: { id: true },
    });
    if (!category) return fail("That topic does not belong to this exam's subject");
    categoryId = category.id;
  }
  let imageId: string | null = null;
  const requestedImage = str(formData, "imageId");
  if (requestedImage !== "") {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: requestedImage, contentType: { startsWith: "image/" } },
      select: { id: true },
    });
    if (!asset) return fail("That image no longer exists. Upload it again.");
    imageId = asset.id;
  }
  try {
    if (existingId === null) {
      const count = await prisma.question.count({ where: { versionId: version.id } });
      if (count >= MAX_QUESTIONS) return fail(`An exam can have at most ${MAX_QUESTIONS} questions`);

      const last = await prisma.question.aggregate({
        where: { versionId: version.id },
        _max: { position: true },
      });

      await prisma.question.create({
        data: {
          versionId: version.id,
          position: (last._max.position ?? 0) + 1,
          type,
          prompt: data.prompt,
          points: data.points,
          explanation: data.explanation,
          categoryId,
          acceptedAnswers: data.acceptedAnswers,
          imageId,
          imageAlt: data.imageAlt,
          options: {
            create: data.options.map((o, index) => ({
              position: index + 1,
              text: o.text,
              isCorrect: o.isCorrect,
            })),
          },
        },
      });
    } else {
      const id = existingId;
      await prisma.$transaction(async (tx) => {
        await tx.question.update({
          where: { id },
          data: {
            prompt: data.prompt,
            points: data.points,
            explanation: data.explanation,
            categoryId,
            acceptedAnswers: data.acceptedAnswers,
            imageId,
            imageAlt: data.imageAlt,
          },
        });
        await tx.answerOption.deleteMany({ where: { questionId: id } });
        if (data.options.length > 0) {
          await tx.answerOption.createMany({
            data: data.options.map((o, index) => ({
              questionId: id,
              position: index + 1,
              text: o.text,
              isCorrect: o.isCorrect,
            })),
          });
        }
      });
    }
  } catch (error) {
    if (errorCode(error) === "P2002") {
      return fail("Another change happened at the same time. Reload the page and try again.");
    }
    console.error("saveQuestion failed:", error instanceof Error ? error.name : "unknown");
    return fail("Could not save the question. Please try again.");
  }

  revalidatePath(examUrl(examId));
  backToExam(examId, "saved", existingId === null ? "Question added" : "Question updated");
}

export async function deleteQuestion(formData: FormData) {
  await requireAdmin();

  const examId = str(formData, "examId");
  const questionId = str(formData, "questionId");
  if (!examId || !questionId) redirect("/admin/exams");

  try {
    await prisma.$transaction(async (tx) => {
      const question = await tx.question.findFirst({
        where: { id: questionId, version: { examId, publishedAt: null } },
        select: { id: true, versionId: true, position: true },
      });
      if (!question) throw new Error("NOT_FOUND");

      await tx.answerOption.deleteMany({ where: { questionId: question.id } });
      await tx.question.delete({ where: { id: question.id } });

      const later = await tx.question.findMany({
        where: { versionId: question.versionId, position: { gt: question.position } },
        orderBy: { position: "asc" },
        select: { id: true, position: true },
      });
      for (const row of later) {
        await tx.question.update({ where: { id: row.id }, data: { position: row.position - 1 } });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      backToExam(examId, "error", "That question is not in the editable version");
    }
    console.error("deleteQuestion failed:", error instanceof Error ? error.name : "unknown");
    backToExam(examId, "error", "Could not delete the question. Please try again.");
  }

  revalidatePath(examUrl(examId));
  backToExam(examId, "saved", "Question deleted");
}

export async function moveQuestion(formData: FormData) {
  await requireAdmin();

  const examId = str(formData, "examId");
  const questionId = str(formData, "questionId");
  const direction = str(formData, "direction");
  if (!examId || !questionId || (direction !== "up" && direction !== "down")) redirect("/admin/exams");

  try {
    await prisma.$transaction(async (tx) => {
      const question = await tx.question.findFirst({
        where: { id: questionId, version: { examId, publishedAt: null } },
        select: { id: true, versionId: true, position: true },
      });
      if (!question) throw new Error("NOT_FOUND");

      const neighbour = await tx.question.findFirst({
        where: {
          versionId: question.versionId,
          position: direction === "up" ? question.position - 1 : question.position + 1,
        },
        select: { id: true, position: true },
      });
      if (!neighbour) return;

      await tx.question.update({ where: { id: question.id }, data: { position: -1 } });
      await tx.question.update({ where: { id: neighbour.id }, data: { position: question.position } });
      await tx.question.update({ where: { id: question.id }, data: { position: neighbour.position } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      backToExam(examId, "error", "That question is not in the editable version");
    }
    console.error("moveQuestion failed:", error instanceof Error ? error.name : "unknown");
    backToExam(examId, "error", "Could not reorder. Please try again.");
  }

  revalidatePath(examUrl(examId));
  backToExam(examId, "saved", "Order updated");
}