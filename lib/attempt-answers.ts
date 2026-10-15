import "server-only";
import prisma from "./prisma";
import { GRACE_SECONDS } from "./attempt-rules";
import { finalizeIfExpired } from "./attempts";
import { sameAnswerContent, validateAnswer, type AnswerPayload } from "./answer-input";

export type CurrentAnswer = AnswerPayload & { revision: number };

export type SaveResult =
  | { kind: "saved"; revision: number }
  | { kind: "conflict"; current: CurrentAnswer }
  | { kind: "ended" }
  | { kind: "invalid"; message: string }
  | { kind: "not_found" };

const invalid = (message: string): SaveResult => ({ kind: "invalid", message });

export async function saveAnswer(input: {
  attemptId: string;
  studentId: string;
  questionId: unknown;
  selectedOptionIds: unknown;
  textAnswer: unknown;
  flagged: unknown;
  baseRevision: unknown;
}): Promise<SaveResult> {
  const { questionId, baseRevision } = input;
  if (typeof questionId !== "string" || questionId === "") return invalid("Invalid answer");
  if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 0 || baseRevision > 1_000_000) {
    return invalid("Invalid answer");
  }

  // Only the student who owns the attempt can save to it.
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: input.attemptId, studentId: input.studentId },
    select: { id: true, versionId: true },
  });
  if (!attempt) return { kind: "not_found" };

  await finalizeIfExpired(attempt.id);

  // Only the question's type and option ids are read here, never the answer key.
  const question = await prisma.question.findFirst({
    where: { id: questionId, versionId: attempt.versionId },
    select: { type: true, options: { select: { id: true } } },
  });
  if (!question) return invalid("That question is not part of this exam");

  const checked = validateAnswer(
    { selectedOptionIds: input.selectedOptionIds, textAnswer: input.textAnswer, flagged: input.flagged },
    { type: question.type, optionIds: question.options.map((o) => o.id) }
  );
  if (!checked.ok) return invalid(checked.message);
  const data = checked.data;

  const now = new Date();
  const stored = {
    selectedOptionIds: data.selectedOptionIds,
    textAnswer: data.textAnswer === "" ? null : data.textAnswer,
    flagged: data.flagged,
  };

  return prisma.$transaction(async (tx): Promise<SaveResult> => {
    // This update locks the attempt row. If the attempt was finalized (or is past
    // deadline plus grace) it matches nothing, so no answer can land after the end.
    const live = await tx.examAttempt.updateMany({
      where: {
        id: attempt.id,
        status: "IN_PROGRESS",
        deadlineAt: { gte: new Date(now.getTime() - GRACE_SECONDS * 1000) },
      },
      data: { lastActivityAt: now },
    });
    if (live.count === 0) return { kind: "ended" };

    if (baseRevision === 0) {
      // First save of this answer. skipDuplicates means a race is a quiet no-op, not an error.
      const created = await tx.attemptAnswer.createMany({
        data: [{ attemptId: attempt.id, questionId, ...stored }],
        skipDuplicates: true,
      });
      if (created.count === 1) return { kind: "saved", revision: 1 };
    } else {
      // Only succeeds if nobody saved a newer revision in the meantime.
      const updated = await tx.attemptAnswer.updateMany({
        where: { attemptId: attempt.id, questionId, revision: baseRevision },
        data: { ...stored, revision: { increment: 1 } },
      });
      if (updated.count === 1) return { kind: "saved", revision: baseRevision + 1 };
    }

    // Someone else saved first. If it says the same thing, this was a retry: accept it.
    const row = await tx.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
      select: { selectedOptionIds: true, textAnswer: true, flagged: true, revision: true },
    });
    const current: CurrentAnswer = row
      ? {
          selectedOptionIds: row.selectedOptionIds,
          textAnswer: row.textAnswer ?? "",
          flagged: row.flagged,
          revision: row.revision,
        }
      : { selectedOptionIds: [], textAnswer: "", flagged: false, revision: 0 };

    if (row && sameAnswerContent(current, data)) {
      return { kind: "saved", revision: current.revision };
    }
    return { kind: "conflict", current };
  });
}