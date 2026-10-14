import assert from "node:assert/strict";
import {
  GRACE_SECONDS,
  acceptsWrites,
  canTransition,
  checkCanStart,
  computeDeadline,
  inProgressKey,
  nextAttemptNumber,
  remainingSeconds,
  shouldFinalize,
} from "../lib/attempt-rules";

const t = (iso: string) => new Date(iso);

// State machine: only the allowed moves.
assert.equal(canTransition("IN_PROGRESS", "SUBMITTED"), true);
assert.equal(canTransition("IN_PROGRESS", "EXPIRED"), true);
assert.equal(canTransition("SUBMITTED", "GRADED"), true);
assert.equal(canTransition("EXPIRED", "GRADED"), true);
assert.equal(canTransition("SUBMITTED", "IN_PROGRESS"), false);
assert.equal(canTransition("EXPIRED", "IN_PROGRESS"), false);
assert.equal(canTransition("GRADED", "IN_PROGRESS"), false);
assert.equal(canTransition("GRADED", "SUBMITTED"), false);
assert.equal(canTransition("IN_PROGRESS", "GRADED"), false);
assert.equal(canTransition("SUBMITTED", "EXPIRED"), false);

// Deadline math.
const start = t("2026-10-15T10:00:00Z");
const deadline = computeDeadline(start, 25);
assert.equal(deadline.toISOString(), "2026-10-15T10:25:00.000Z");
assert.equal(remainingSeconds(t("2026-10-15T10:00:00Z"), deadline), 1500);
assert.equal(remainingSeconds(t("2026-10-15T10:24:59.200Z"), deadline), 1);
assert.equal(remainingSeconds(t("2026-10-15T10:30:00Z"), deadline), 0);

// Writes: allowed until deadline + grace, never after, never when not in progress.
const justBefore = t("2026-10-15T10:24:59Z");
const insideGrace = new Date(deadline.getTime() + (GRACE_SECONDS - 1) * 1000);
const pastGrace = new Date(deadline.getTime() + (GRACE_SECONDS + 1) * 1000);
assert.equal(acceptsWrites({ status: "IN_PROGRESS", now: justBefore, deadlineAt: deadline }), true);
assert.equal(acceptsWrites({ status: "IN_PROGRESS", now: insideGrace, deadlineAt: deadline }), true);
assert.equal(acceptsWrites({ status: "IN_PROGRESS", now: pastGrace, deadlineAt: deadline }), false);
assert.equal(acceptsWrites({ status: "SUBMITTED", now: justBefore, deadlineAt: deadline }), false);
assert.equal(acceptsWrites({ status: "EXPIRED", now: justBefore, deadlineAt: deadline }), false);

// Finalize only after deadline + grace, and only when in progress.
assert.equal(shouldFinalize({ status: "IN_PROGRESS", now: insideGrace, deadlineAt: deadline }), false);
assert.equal(shouldFinalize({ status: "IN_PROGRESS", now: pastGrace, deadlineAt: deadline }), true);
assert.equal(shouldFinalize({ status: "SUBMITTED", now: pastGrace, deadlineAt: deadline }), false);

// Start rules.
const base = { examLive: true, windowState: "AVAILABLE" as const, attemptsAllowed: 2, attemptsUsed: 0, hasInProgress: false };
assert.deepEqual(checkCanStart(base), { ok: true });
assert.deepEqual(checkCanStart({ ...base, attemptsUsed: 1 }), { ok: true });
assert.deepEqual(checkCanStart({ ...base, attemptsUsed: 2 }), { ok: false, reason: "NO_ATTEMPTS_LEFT" });
assert.deepEqual(checkCanStart({ ...base, windowState: "UPCOMING" }), { ok: false, reason: "NOT_OPEN_YET" });
assert.deepEqual(checkCanStart({ ...base, windowState: "CLOSED" }), { ok: false, reason: "CLOSED" });
assert.deepEqual(checkCanStart({ ...base, examLive: false }), { ok: false, reason: "EXAM_NOT_LIVE" });
assert.deepEqual(checkCanStart({ ...base, hasInProgress: true }), { ok: false, reason: "ALREADY_IN_PROGRESS" });

// Numbering and the active-attempt key.
assert.equal(nextAttemptNumber([]), 1);
assert.equal(nextAttemptNumber([1, 2]), 3);
assert.equal(nextAttemptNumber([3, 1]), 4);
assert.equal(inProgressKey("s1", "e1"), "s1:e1");

console.log("All attempt rule checks passed.");