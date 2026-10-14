import type { WindowState } from "./exam-window";

export type AttemptStatusValue = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "GRADED";

/** After the deadline, a save already on its way is still accepted for this long. */
export const GRACE_SECONDS = 10;

const TRANSITIONS: Record<AttemptStatusValue, AttemptStatusValue[]> = {
  IN_PROGRESS: ["SUBMITTED", "EXPIRED"],
  SUBMITTED: ["GRADED"],
  EXPIRED: ["GRADED"],
  GRADED: [],
};

/** The only moves an attempt may ever make. Everything else is refused. */
export function canTransition(from: AttemptStatusValue, to: AttemptStatusValue): boolean {
  return TRANSITIONS[from].includes(to);
}

export function computeDeadline(startedAt: Date, durationMinutes: number): Date {
  return new Date(startedAt.getTime() + durationMinutes * 60_000);
}

export function remainingSeconds(now: Date, deadlineAt: Date): number {
  return Math.max(0, Math.ceil((deadlineAt.getTime() - now.getTime()) / 1000));
}

/** May answers still be written? Only while in progress, up to the deadline plus the grace. */
export function acceptsWrites(input: { status: AttemptStatusValue; now: Date; deadlineAt: Date }): boolean {
  return (
    input.status === "IN_PROGRESS" &&
    input.now.getTime() <= input.deadlineAt.getTime() + GRACE_SECONDS * 1000
  );
}

/** Has an in-progress attempt run past its deadline AND the grace? Then it must be finalized. */
export function shouldFinalize(input: { status: AttemptStatusValue; now: Date; deadlineAt: Date }): boolean {
  return (
    input.status === "IN_PROGRESS" &&
    input.now.getTime() > input.deadlineAt.getTime() + GRACE_SECONDS * 1000
  );
}

export type StartDenial =
  | "ALREADY_IN_PROGRESS"
  | "EXAM_NOT_LIVE"
  | "NOT_OPEN_YET"
  | "CLOSED"
  | "NO_ATTEMPTS_LEFT";

export const START_DENIAL_MESSAGES: Record<StartDenial, string> = {
  ALREADY_IN_PROGRESS: "You already have an attempt in progress for this exam.",
  EXAM_NOT_LIVE: "This exam is not available right now. Please contact your tutor.",
  NOT_OPEN_YET: "This exam has not opened yet.",
  CLOSED: "The deadline to start this exam has passed.",
  NO_ATTEMPTS_LEFT: "You have used all your attempts for this exam.",
};

export function checkCanStart(input: {
  examLive: boolean;
  windowState: WindowState;
  attemptsAllowed: number;
  attemptsUsed: number;
  hasInProgress: boolean;
}): { ok: true } | { ok: false; reason: StartDenial } {
  if (input.hasInProgress) return { ok: false, reason: "ALREADY_IN_PROGRESS" };
  if (!input.examLive) return { ok: false, reason: "EXAM_NOT_LIVE" };
  if (input.windowState === "UPCOMING") return { ok: false, reason: "NOT_OPEN_YET" };
  if (input.windowState === "CLOSED") return { ok: false, reason: "CLOSED" };
  if (input.attemptsUsed >= input.attemptsAllowed) return { ok: false, reason: "NO_ATTEMPTS_LEFT" };
  return { ok: true };
}

export function nextAttemptNumber(existing: number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}

/** Held in the database while an attempt is in progress. Its unique constraint allows only one active attempt. */
export function inProgressKey(studentId: string, examId: string): string {
  return `${studentId}:${examId}`;
}