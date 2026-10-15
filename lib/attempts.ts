import "server-only";
import prisma from "./prisma";
import { GRACE_SECONDS, shouldFinalize } from "./attempt-rules";

/**
 * Ends an attempt whose time ran out. Safe to call as often as you like: it only
 * acts on an IN_PROGRESS attempt that is past its deadline plus the grace, and a
 * second call (or a second tab) finds nothing left to do. Returns true if it ended it.
 */
export async function finalizeIfExpired(attemptId: string): Promise<boolean> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { status: true, deadlineAt: true },
  });
  if (!attempt) return false;

  const now = new Date();
  if (!shouldFinalize({ status: attempt.status, now, deadlineAt: attempt.deadlineAt })) {
    return false;
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.examAttempt.updateMany({
      where: {
        id: attemptId,
        status: "IN_PROGRESS",
        deadlineAt: { lt: new Date(now.getTime() - GRACE_SECONDS * 1000) },
      },
      data: {
        status: "EXPIRED",
        endReason: "TIMEOUT",
        submittedAt: attempt.deadlineAt,
        inProgressKey: null,
      },
    });
    if (result.count === 0) return false;

    await tx.attemptEvent.create({
      data: { attemptId, type: "AUTO_SUBMITTED", details: { reason: "TIMEOUT" } },
    });
    return true;
  });
}

/** Ends every expired in-progress attempt of one student. Cheap, and safe to call often. */
export async function finalizeExpiredForStudent(studentId: string): Promise<void> {
  const cutoff = new Date(Date.now() - GRACE_SECONDS * 1000);
  const stale = await prisma.examAttempt.findMany({
    where: { studentId, status: "IN_PROGRESS", deadlineAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const { id } of stale) {
    await finalizeIfExpired(id);
  }
}

/** Ends every expired in-progress attempt (used by the admin pages so they never show stale "in progress"). */
export async function finalizeAllExpired(limit = 200): Promise<void> {
  const cutoff = new Date(Date.now() - GRACE_SECONDS * 1000);
  const stale = await prisma.examAttempt.findMany({
    where: { status: "IN_PROGRESS", deadlineAt: { lt: cutoff } },
    select: { id: true },
    take: limit,
  });
  for (const { id } of stale) {
    await finalizeIfExpired(id);
  }
}