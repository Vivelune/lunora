import "server-only";
import prisma from "./prisma";
import { GRACE_SECONDS } from "./attempt-rules";

/**
 * A student may see an exam image only while they have an attempt IN PROGRESS
 * on an exam version that has a question using it. Phase 12 will extend this
 * to released result reviews. Keep every "may this student see this image?"
 * decision in this file.
 */
export async function studentCanViewExamImage(
  studentProfileId: string,
  assetId: string
): Promise<boolean> {
  const cutoff = new Date(Date.now() - GRACE_SECONDS * 1000);

  const count = await prisma.examAttempt.count({
    where: {
      studentId: studentProfileId,
      status: "IN_PROGRESS",
      deadlineAt: { gte: cutoff },
      version: { questions: { some: { imageId: assetId } } },
    },
  });

  return count > 0;
}