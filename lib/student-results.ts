import "server-only";
import prisma from "./prisma";
import { releaseFromRow } from "./results-release";
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

export type ResultSummary = {
  examTitle: string;
  subject: string;
  attemptNumber: number;
  startedAt: Date;
  submittedAt: Date | null;
  timedOut: boolean;
  minutesUsed: number | null;
  pointsEarned: string;
  pointsPossible: string;
  percentage: string;
  passed: boolean | null;
  passingPercent: number | null;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  explanationsReleased: boolean;
};

export type StudentResult =
  | { kind: "not_found" }
  | { kind: "in_progress" }
  | { kind: "pending"; availableAfter: Date | null }
  | { kind: "released"; summary: ResultSummary; review: ReviewQuestion[] };

export async function getStudentResult(attemptId: string, studentId: string): Promise<StudentResult> {
  // Only the student who owns the attempt can read it.
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId },
    select: {
      id: true,
      status: true,
      versionId: true,
      attemptNumber: true,
      startedAt: true,
      submittedAt: true,
      endReason: true,
      pointsEarned: true,
      pointsPossible: true,
      percentage: true,
      passed: true,
      gradedAt: true,
      resultsReleasedAt: true,
      explanationsReleasedAt: true,
      version: { select: { resultRelease: true, explanationRelease: true, durationMinutes: true, passingPercent: true } },
      assignment: { select: { dueDate: true } },
      exam: {
        select: {
          title: true,
          availableUntil: true,
          subject: { select: { name: true, parent: { select: { name: true } } } },
        },
      },
    },
  });
  if (!attempt) return { kind: "not_found" };
  if (attempt.status === "IN_PROGRESS") return { kind: "in_progress" };

  const state = releaseFromRow(attempt);

  // Not released: reveal nothing at all, and do not even load the answer key.
  if (!state.resultsReleased || attempt.pointsEarned === null || attempt.pointsPossible === null || attempt.percentage === null) {
    return { kind: "pending", availableAfter: state.availableAfter };
  }

  const [questions, answers] = await Promise.all([
    prisma.question.findMany({
      where: { versionId: attempt.versionId },
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

  const review: ReviewQuestion[] = questions.map((q, index) => {
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
      // Explanations have their own release. Never included until released.
      explanation: state.explanationsReleased ? q.explanation : null,
    };
  });

  const minutesUsed = attempt.submittedAt
    ? Math.max(1, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000))
    : null;

  return {
    kind: "released",
    review,
    summary: {
      examTitle: attempt.exam.title,
      subject: attempt.exam.subject.parent
        ? `${attempt.exam.subject.parent.name} ${attempt.exam.subject.name}`
        : attempt.exam.subject.name,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timedOut: attempt.endReason === "TIMEOUT",
      minutesUsed,
      pointsEarned: attempt.pointsEarned.toString(),
      pointsPossible: attempt.pointsPossible.toString(),
      percentage: attempt.percentage.toString(),
      passed: attempt.passed,
      passingPercent: attempt.version.passingPercent,
      correctCount: review.filter((r) => r.status === "CORRECT").length,
      incorrectCount: review.filter((r) => r.status === "INCORRECT").length,
      unansweredCount: review.filter((r) => r.status === "UNANSWERED").length,
      explanationsReleased: state.explanationsReleased,
    },
  };
}