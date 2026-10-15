import "server-only";
import prisma from "./prisma";
import { examWindow } from "./exam-window";
import { evaluateRelease, type ReleasePolicyValue, type ReleaseState } from "./release";

/** Everything needed to decide whether an attempt's results are released. */
export const RELEASE_ROW_SELECT = {
  gradedAt: true,
  resultsReleasedAt: true,
  explanationsReleasedAt: true,
  version: { select: { resultRelease: true, explanationRelease: true, durationMinutes: true } },
  assignment: { select: { dueDate: true } },
  exam: { select: { availableUntil: true } },
} as const;

export type ReleaseRow = {
  gradedAt: Date | null;
  resultsReleasedAt: Date | null;
  explanationsReleasedAt: Date | null;
  version: { resultRelease: ReleasePolicyValue; explanationRelease: ReleasePolicyValue; durationMinutes: number };
  assignment: { dueDate: Date | null } | null;
  exam: { availableUntil: Date | null };
};

export function releaseFromRow(row: ReleaseRow, now: Date = new Date()): ReleaseState {
  // The closing date is the earlier of this student's due date and the exam's end date.
  const closesAt = examWindow({
    now,
    dueDate: row.assignment?.dueDate ?? null,
    examUntil: row.exam.availableUntil,
  }).closesAt;

  return evaluateRelease(
    {
      gradedAt: row.gradedAt,
      resultsReleasedAt: row.resultsReleasedAt,
      explanationsReleasedAt: row.explanationsReleasedAt,
      resultPolicy: row.version.resultRelease,
      explanationPolicy: row.version.explanationRelease,
      durationMinutes: row.version.durationMinutes,
      closesAt,
    },
    now
  );
}

export async function getAttemptRelease(attemptId: string): Promise<ReleaseState | null> {
  const row = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: RELEASE_ROW_SELECT,
  });
  return row ? releaseFromRow(row) : null;
}

/** Graded attempts of an exam that an admin could release now. Used for the count and the action. */
export async function getBulkReleaseTargets(
  examId: string,
  kind: "results" | "explanations"
): Promise<string[]> {
  const rows = await prisma.examAttempt.findMany({
    where: { examId, status: "GRADED" },
    select: { id: true, ...RELEASE_ROW_SELECT },
  });
  const now = new Date();
  return rows
    .filter((row) => {
      const state = releaseFromRow(row, now);
      return kind === "results" ? !state.resultsReleased : state.resultsReleased && !state.explanationsReleased;
    })
    .map((row) => row.id);
}