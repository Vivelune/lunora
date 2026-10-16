import "server-only";
import prisma from "./prisma";
import { loadReview, type ReviewQuestion } from "./review-builder";

/** The admin view: every answer next to the key, with explanations, whatever the release state. */
export async function getAdminReview(attemptId: string): Promise<ReviewQuestion[] | null> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { versionId: true },
  });
  if (!attempt) return null;
  return loadReview(attemptId, attempt.versionId, true);
}