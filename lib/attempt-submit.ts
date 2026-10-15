import "server-only";
import prisma from "./prisma";
import { GRACE_SECONDS, canTransition, type AttemptStatusValue } from "./attempt-rules";
import { finalizeIfExpired } from "./attempts";

export type SubmitResult =
  | { kind: "submitted" }
  | { kind: "already_ended"; status: AttemptStatusValue }
  | { kind: "not_found" };

export async function submitAttempt(attemptId: string, studentId: string): Promise<SubmitResult> {
  // Only the student who owns the attempt can submit it.
  const owned = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId },
    select: { id: true },
  });
  if (!owned) return { kind: "not_found" };

  // If time already ran out (past the grace), this ends it as EXPIRED first.
  await finalizeIfExpired(owned.id);

  const now = new Date();
  const cutoff = new Date(now.getTime() - GRACE_SECONDS * 1000);

  return prisma.$transaction(async (tx): Promise<SubmitResult> => {
    const attempt = await tx.examAttempt.findUnique({
      where: { id: owned.id },
      select: { status: true, deadlineAt: true },
    });
    if (!attempt) return { kind: "not_found" };

    if (!canTransition(attempt.status, "SUBMITTED")) {
      return { kind: "already_ended", status: attempt.status };
    }

    // The status condition makes this a compare-and-swap. Two submits at once: one wins.
    const result = await tx.examAttempt.updateMany({
      where: { id: owned.id, status: "IN_PROGRESS", deadlineAt: { gte: cutoff } },
      data: {
        status: "SUBMITTED",
        endReason: "STUDENT",
        submittedAt: now.getTime() > attempt.deadlineAt.getTime() ? attempt.deadlineAt : now,
        lastActivityAt: now,
        inProgressKey: null,
      },
    });

    if (result.count === 0) {
      const latest = await tx.examAttempt.findUnique({ where: { id: owned.id }, select: { status: true } });
      return { kind: "already_ended", status: latest?.status ?? attempt.status };
    }

    await tx.attemptEvent.create({ data: { attemptId: owned.id, type: "SUBMITTED" } });
    return { kind: "submitted" };
  });
}