import "server-only";
import  prisma  from "./prisma";
import { computeItemStates } from "./plan-progress";

/**
 * A student may open a lesson only if an ACTIVE assignment that has already
 * started contains it, and (strict order) its item is not locked.
 * Keep every "may this student open it?" decision in this file.
 */
export async function studentHasLessonAccess(
  studentProfileId: string,
  lessonId: string
): Promise<boolean> {
  const now = new Date();

  const assignments = await prisma.lessonPlanAssignment.findMany({
    where: {
      studentId: studentProfileId,
      status: "ACTIVE",
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      version: { items: { some: { lessonId } } },
    },
    select: {
      version: {
        select: {
          items: {
            orderBy: { position: "asc" },
            select: { id: true, isRequired: true, lessonId: true },
          },
        },
      },
      progress: { select: { itemId: true } },
    },
  });

  for (const assignment of assignments) {
    const states = computeItemStates(
      assignment.version.items,
      new Set(assignment.progress.map((p) => p.itemId))
    );
    const item = assignment.version.items.find((i) => i.lessonId === lessonId);
    if (item && states.get(item.id) !== "LOCKED") {
      return true;
    }
  }
  return false;
}

/** Returns a published lesson the student may open, otherwise null. */
export async function getLessonForStudent(lessonId: string, studentProfileId: string) {
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
      resources: {
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, contentType: true },
      },
    },
  });

  if (!lesson) {
    return null;
  }

  const allowed = await studentHasLessonAccess(studentProfileId, lesson.id);
  return allowed ? lesson : null;
}