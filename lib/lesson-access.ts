import "server-only";
import prisma from "./prisma";

/**
 * Phase 7: deny by default. Phase 8 replaces this with a check against
 * lesson plan assignments. Keep every "may this student open it?" decision
 * in this file so there is only one rule to get right.
 */
export async function studentHasLessonAccess(
  studentProfileId: string,
  lessonId: string
): Promise<boolean> {
  void studentProfileId;
  void lessonId;
  return false;
}

/** Returns a published lesson the student may open, otherwise null. */
export async function getLessonForStudent(
  lessonId: string,
  studentProfileId: string
) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      description: true,
      objectives: true,
      content: true,
      estimatedMinutes: true,
      subject: { select: { name: true, parent: { select: { name: true } } } },
      category: { select: { name: true } },
    },
  });

  if (!lesson) {
    return null;
  }

  const allowed = await studentHasLessonAccess(studentProfileId, lesson.id);
  return allowed ? lesson : null;
}