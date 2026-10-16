import "server-only";
import prisma from "./prisma";
import { releaseFromRow } from "./results-release";
import { loadReview, type ReviewQuestion } from "./review-builder";

export type { ReviewQuestion };

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

const subjectLabel = (s: { name: string; parent: { name: string } | null }) =>
  s.parent ? `${s.parent.name} ${s.name}` : s.name;

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
  if (
    !state.resultsReleased ||
    attempt.pointsEarned === null ||
    attempt.pointsPossible === null ||
    attempt.percentage === null
  ) {
    return { kind: "pending", availableAfter: state.availableAfter };
  }

  const review = await loadReview(attempt.id, attempt.versionId, state.explanationsReleased);

  const minutesUsed = attempt.submittedAt
    ? Math.max(1, Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000))
    : null;

  return {
    kind: "released",
    review,
    summary: {
      examTitle: attempt.exam.title,
      subject: subjectLabel(attempt.exam.subject),
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

export type ResultListItem = {
  attemptId: string;
  examTitle: string;
  subject: string;
  attemptNumber: number;
  endedAt: Date | null;
  released: boolean;
  availableAfter: Date | null;
  /** Filled in ONLY when the results are released. Otherwise always null. */
  percentage: string | null;
  pointsEarned: string | null;
  pointsPossible: string | null;
  passed: boolean | null;
};

/** A student's ended attempts, newest first. Scores are included only for released results. */
export async function getStudentResultsList(studentId: string, limit = 50): Promise<ResultListItem[]> {
  const rows = await prisma.examAttempt.findMany({
    where: { studentId, status: { in: ["SUBMITTED", "EXPIRED", "GRADED"] } },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      attemptNumber: true,
      submittedAt: true,
      pointsEarned: true,
      pointsPossible: true,
      percentage: true,
      passed: true,
      gradedAt: true,
      resultsReleasedAt: true,
      explanationsReleasedAt: true,
      version: { select: { resultRelease: true, explanationRelease: true, durationMinutes: true } },
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

  const now = new Date();
  return rows.map((row) => {
    const state = releaseFromRow(row, now);
    const showScore = state.resultsReleased && row.percentage !== null;
    return {
      attemptId: row.id,
      examTitle: row.exam.title,
      subject: subjectLabel(row.exam.subject),
      attemptNumber: row.attemptNumber,
      endedAt: row.submittedAt,
      released: state.resultsReleased,
      availableAfter: state.availableAfter,
      percentage: showScore ? row.percentage?.toString() ?? null : null,
      pointsEarned: showScore ? row.pointsEarned?.toString() ?? null : null,
      pointsPossible: showScore ? row.pointsPossible?.toString() ?? null : null,
      passed: showScore ? row.passed : null,
    };
  });
}