import "server-only";
import prisma from "./prisma";
import { finalizeIfExpired } from "./attempts";
import { tryGradeAttempt } from "./attempt-grading";
import {
  actionFor,
  awayCounts,
  fullscreenCounts,
  isMonitoring,
  type FocusAction,
  type FocusPolicyValue,
} from "./focus-rules";

export type FocusEventType = "FOCUS_LOST" | "FOCUS_RETURNED" | "FULLSCREEN_EXITED";

export type FocusResult =
  | { kind: "not_found" }
  | { kind: "ended" }
  | { kind: "off" }
  | { kind: "recorded"; counted: boolean; violations: number; limit: number; action: FocusAction };

const MAX_EVENTS_PER_ATTEMPT = 500;

type Db = Pick<typeof prisma, "examAttempt" | "attemptEvent">;

async function countViolation(
  db: Db,
  args: { attemptId: string; policy: FocusPolicyValue; limit: number; now: Date }
): Promise<{ violations: number; action: FocusAction }> {
  const { attemptId, policy, limit, now } = args;

  const updated = await db.examAttempt.update({
    where: { id: attemptId },
    data: { focusViolations: { increment: 1 }, lastViolationAt: now },
    select: { focusViolations: true },
  });
  const violations = updated.focusViolations;
  const action = actionFor(policy, violations, limit);

  if (action === "WARN") {
    await db.attemptEvent.create({
      data: { attemptId, type: "WARNING_SHOWN", details: { count: violations, limit } },
    });
  }

  if (action === "FLAG") {
    await db.examAttempt.update({ where: { id: attemptId }, data: { flaggedForReview: true } });
    await db.attemptEvent.create({
      data: { attemptId, type: "WARNING_SHOWN", details: { count: violations, limit, flagged: true } },
    });
  }

  if (action === "END") {
    const ended = await db.examAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: {
        status: "EXPIRED",
        endReason: "FOCUS_VIOLATION",
        submittedAt: now,
        inProgressKey: null,
        flaggedForReview: true,
      },
    });
    if (ended.count === 1) {
      await db.attemptEvent.create({
        data: { attemptId, type: "AUTO_SUBMITTED", details: { reason: "FOCUS_VIOLATION", count: violations, limit } },
      });
    }
  }

  return { violations, action };
}

async function recordFocusEventInner(input: {
  attemptId: string;
  studentId: string;
  type: FocusEventType;
  occurredAt?: Date;
}): Promise<FocusResult> {
  // Use the client's reported time when it is plausible, so a slow network
  // does not distort how long a student was away. Clamp to +/- 60s.
  const serverNow = new Date();
  const now =
    input.occurredAt &&
    Math.abs(serverNow.getTime() - input.occurredAt.getTime()) < 60_000
      ? input.occurredAt
      : serverNow;

  // Only the student who owns the attempt can report on it.
  const owned = await prisma.examAttempt.findFirst({
    where: { id: input.attemptId, studentId: input.studentId },
    select: { id: true },
  });
  if (!owned) return { kind: "not_found" };

  await finalizeIfExpired(owned.id);

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: owned.id },
    select: {
      status: true,
      focusLostAt: true,
      lastViolationAt: true,
      focusViolations: true,
      version: { select: { focusPolicy: true, maxFocusViolations: true } },
      assignment: { select: { focusExempt: true } },
    },
  });
  if (!attempt) return { kind: "not_found" };
  if (attempt.status !== "IN_PROGRESS") return { kind: "ended" };

  const policy = attempt.version.focusPolicy;
  const limit = attempt.version.maxFocusViolations;
  const exempt = attempt.assignment?.focusExempt ?? false;
  if (!isMonitoring(policy, exempt)) return { kind: "off" };

  const quiet: FocusResult = {
    kind: "recorded",
    counted: false,
    violations: attempt.focusViolations,
    limit,
    action: "NONE",
  };

  // A cap, so a misbehaving page cannot flood the database.
  const total = await prisma.attemptEvent.count({ where: { attemptId: owned.id } });
  if (total >= MAX_EVENTS_PER_ATTEMPT) return quiet;

  if (input.type === "FOCUS_LOST") {
    await prisma.$transaction(async (tx) => {
      const marked = await tx.examAttempt.updateMany({
        where: { id: owned.id, status: "IN_PROGRESS", focusLostAt: null },
        data: { focusLostAt: now },
      });
      if (marked.count === 1) {
        await tx.attemptEvent.create({ data: { attemptId: owned.id, type: "FOCUS_LOST" } });
      }
    });
    return quiet;
  }

  if (input.type === "FOCUS_RETURNED") {
    const lostAt = attempt.focusLostAt;
    if (!lostAt) return quiet;

    const awayMs = now.getTime() - lostAt.getTime();
    const counts = awayCounts(awayMs);

    return prisma.$transaction(async (tx): Promise<FocusResult> => {
      // Clearing "lost" is the guard: two returns at once, only one proceeds.
      const cleared = await tx.examAttempt.updateMany({
        where: { id: owned.id, status: "IN_PROGRESS", focusLostAt: lostAt },
        data: { focusLostAt: null },
      });
      if (cleared.count === 0) {
        // The other concurrent return already cleared it. Report the current
        // count so callers still see fresh numbers, but do not count again.
        const fresh = await tx.examAttempt.findUnique({
          where: { id: owned.id },
          select: { focusViolations: true },
        });
        return {
          kind: "recorded",
          counted: false,
          violations: fresh?.focusViolations ?? attempt.focusViolations,
          limit,
          action: "NONE",
        };
      }

      await tx.attemptEvent.create({
        data: { attemptId: owned.id, type: "FOCUS_RETURNED", details: { awayMs, counted: counts } },
      });
      if (!counts) return quiet;

      const result = await countViolation(tx, { attemptId: owned.id, policy, limit, now });
      return { kind: "recorded", counted: true, violations: result.violations, limit, action: result.action };
    });
  }

  // FULLSCREEN_EXITED
  const counts = fullscreenCounts(now, attempt.lastViolationAt);
  return prisma.$transaction(async (tx): Promise<FocusResult> => {
    await tx.attemptEvent.create({
      data: { attemptId: owned.id, type: "FULLSCREEN_EXITED", details: { counted: counts } },
    });
    if (!counts) return quiet;

    const result = await countViolation(tx, { attemptId: owned.id, policy, limit, now });
    return { kind: "recorded", counted: true, violations: result.violations, limit, action: result.action };
  });
}

export async function recordFocusEvent(input: {
  attemptId: string;
  studentId: string;
  type: FocusEventType;
  occurredAt?: Date;
}): Promise<FocusResult> {
  const result = await recordFocusEventInner(input);
  if (result.kind === "recorded" && result.action === "END") {
    await tryGradeAttempt(input.attemptId);
  }
  return result;
}