import "server-only";
import prisma from "./prisma";
import {
  STUDENT_QUESTION_SELECT,
  toStudentQuestion,
  type StudentQuestion,
} from "./exam-student-safe";

/**
 * The only function student-facing code may use to read questions.
 * Callers must already have verified the student is allowed to see this version.
 */
export async function getStudentQuestions(
  versionId: string
): Promise<StudentQuestion[]> {
  const rows = await prisma.question.findMany({
    where: { versionId },
    orderBy: { position: "asc" },
    select: STUDENT_QUESTION_SELECT,
  });
  return rows.map(toStudentQuestion);
}

/**
 * Count of questions in a version. Carries no answer-key data, but lives here
 * so student UI never touches prisma.question directly.
 */
export async function countStudentQuestions(versionId: string): Promise<number> {
  return prisma.question.count({ where: { versionId } });
}