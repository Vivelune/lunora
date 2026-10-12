import "server-only";
import prisma  from "./prisma";

export type ItemState = "COMPLETED" | "AVAILABLE" | "LOCKED";

/**
 * Strict order: an item is locked while any EARLIER required item is incomplete.
 * Optional items never block anything. Items must be passed in position order.
 */
export function computeItemStates(
  items: { id: string; isRequired: boolean }[],
  completedIds: Set<string>
): Map<string, ItemState> {
  const states = new Map<string, ItemState>();
  let blocked = false;

  for (const item of items) {
    if (completedIds.has(item.id)) {
      states.set(item.id, "COMPLETED");
      continue;
    }
    states.set(item.id, blocked ? "LOCKED" : "AVAILABLE");
    if (item.isRequired) {
      blocked = true;
    }
  }
  return states;
}

export type AssignmentSummary = {
  id: string;
  subjectId: string;
  planTitle: string;
  planDescription: string | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  instructions: string | null;
  dueDate: Date | null;
  startDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  requiredTotal: number;
  requiredDone: number;
  doneItems: number;
  nextLessonTitle: string | null;
  isOverdue: boolean;
  startsInFuture: boolean;
};

const PRIORITY_RANK = { HIGH: 0, NORMAL: 1, LOW: 2 } as const;

/** Overdue first, then earliest due date (no date last), then priority. */
export function sortAssignments(a: AssignmentSummary, b: AssignmentSummary): number {
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
  const aDue = a.dueDate?.getTime() ?? Infinity;
  const bDue = b.dueDate?.getTime() ?? Infinity;
  if (aDue !== bDue) return aDue - bDue;
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

/** All of one student's active assignments, with calculated progress. */
export async function getStudentAssignments(studentId: string): Promise<AssignmentSummary[]> {
  const rows = await prisma.lessonPlanAssignment.findMany({
    where: { studentId, status: "ACTIVE" },
    select: {
      id: true,
      priority: true,
      instructions: true,
      dueDate: true,
      startDate: true,
      startedAt: true,
      completedAt: true,
      plan: { select: { title: true, description: true, subjectId: true } },
      version: {
        select: {
          items: {
            orderBy: { position: "asc" },
            select: { id: true, isRequired: true, lesson: { select: { title: true } } },
          },
        },
      },
      progress: { select: { itemId: true } },
    },
  });

  const now = Date.now();

  return rows
    .map((row) => {
      const items = row.version.items;
      const completedIds = new Set(row.progress.map((p) => p.itemId));
      const states = computeItemStates(items, completedIds);
      const required = items.filter((i) => i.isRequired);
      const next = items.find((i) => states.get(i.id) === "AVAILABLE");

      return {
        id: row.id,
        subjectId: row.plan.subjectId,
        planTitle: row.plan.title,
        planDescription: row.plan.description,
        priority: row.priority,
        instructions: row.instructions,
        dueDate: row.dueDate,
        startDate: row.startDate,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        requiredTotal: required.length,
        requiredDone: required.filter((i) => completedIds.has(i.id)).length,
        doneItems: items.filter((i) => completedIds.has(i.id)).length,
        nextLessonTitle: next?.lesson?.title ?? null,
        isOverdue: !row.completedAt && row.dueDate !== null && row.dueDate.getTime() < now,
        startsInFuture: row.startDate !== null && row.startDate.getTime() > now,
      };
    })
    .sort(sortAssignments);
}