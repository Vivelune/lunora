import "server-only";
import prisma from "./prisma";
import { GRACE_SECONDS } from "./attempt-rules";
import { RELEASE_ROW_SELECT, releaseFromRow } from "./results-release";

/**
 * A student may see an exam image in two situations only:
 *  1. while they have an attempt IN PROGRESS on an exam version that uses it, or
 *  2. in the review of one of their own attempts whose results have been released.
 * Keep every "may this student see this image?" decision in this file.
 */
export async function studentCanViewExamImage(
  studentProfileId: string,
  assetId: string
): Promise<boolean> {
  const cutoff = new Date(Date.now() - GRACE_SECONDS * 1000);

  const active = await prisma.examAttempt.count({
    where: {
      studentId: studentProfileId,
      status: "IN_PROGRESS",
      deadlineAt: { gte: cutoff },
      version: { questions: { some: { imageId: assetId } } },
    },
  });
  if (active > 0) return true;

  const graded = await prisma.examAttempt.findMany({
    where: {
      studentId: studentProfileId,
      status: "GRADED",
      version: { questions: { some: { imageId: assetId } } },
    },
    select: RELEASE_ROW_SELECT,
  });
  const now = new Date();
  return graded.some((attempt) => releaseFromRow(attempt, now).resultsReleased);
}