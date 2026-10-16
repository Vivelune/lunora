import "server-only";
import prisma from "./prisma";
import type { QuestionTypeValue } from "./question-input";

export type ReviewQuestion = {
  id: string;
  number: number;
  type: QuestionTypeValue;
  prompt: string;
  imageId: string | null;
  imageAlt: string | null;
  pointsPossible: string;
  pointsAwarded: string;
  status: "CORRECT" | "INCORRECT" | "UNANSWERED";
  options: { id: string; text: string; chosen: boolean; right: boolean }[];
  givenText: string | null;
  acceptedList: string[];
  explanation: string | null;
};

/**
 * Builds the review of a graded attempt. Callers decide WHO may see it:
 * the student path only calls this after release, and passes whether explanations are released.
 */
export async function loadReview(
  attemptId: string,
  versionId: string,
  includeExplanations: boolean
): Promise<ReviewQuestion[]> {
  const [questions, answers] = await Promise.all([
    prisma.question.findMany({
      where: { versionId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        type: true,
        prompt: true,
        imageId: true,
        imageAlt: true,
        points: true,
        explanation: true,
        acceptedAnswers: true,
        options: { orderBy: { position: "asc" }, select: { id: true, text: true, isCorrect: true } },
      },
    }),
    prisma.attemptAnswer.findMany({
      where: { attemptId },
      select: { questionId: true, selectedOptionIds: true, textAnswer: true, isCorrect: true, pointsAwarded: true },
    }),
  ]);

  const given = new Map(answers.map((a) => [a.questionId, a]));

  return questions.map((q, index) => {
    const row = given.get(q.id);
    const selected = new Set(row?.selectedOptionIds ?? []);
    const text = row?.textAnswer ?? null;
    const answered = selected.size > 0 || (text !== null && text.trim() !== "");

    return {
      id: q.id,
      number: index + 1,
      type: q.type,
      prompt: q.prompt,
      imageId: q.imageId,
      imageAlt: q.imageAlt,
      pointsPossible: q.points.toString(),
      pointsAwarded: row?.pointsAwarded?.toString() ?? "0",
      status: !answered ? "UNANSWERED" : row?.isCorrect === true ? "CORRECT" : "INCORRECT",
      options: q.options.map((o) => ({ id: o.id, text: o.text, chosen: selected.has(o.id), right: o.isCorrect })),
      givenText: text,
      acceptedList: q.type === "SHORT_ANSWER" ? q.acceptedAnswers : [],
      explanation: includeExplanations ? q.explanation : null,
    };
  });
}