import "server-only";
import prisma from "./prisma";
import { examWindow } from "./exam-window";
import type { ExamFact, PlanFact } from "./progress-core";

export type ActivityItem = { kind: "LESSON" | "EXAM"; title: string; detail: string; at: Date };

const subjectLabel = (s: { name: string; parent: { name: string } | null }) =>
  s.parent ? `${s.parent.name} ${s.name}` : s.name;

/** Plan and exam progress facts for many students at once, in a fixed number of queries. */
export async function loadProgressMany(
  studentIds: string[]
): Promise<Map<string, { plans: PlanFact[]; exams: ExamFact[] }>> {
  const result = new Map<string, { plans: PlanFact[]; exams: ExamFact[] }>(
    studentIds.map((id) => [id, { plans: [], exams: [] }])
  );
  if (studentIds.length === 0) return result;

  const now = new Date();

  const [planRows, examRows, attemptRows] = await Promise.all([
    prisma.lessonPlanAssignment.findMany({
      where: { studentId: { in: studentIds }, status: "ACTIVE" },
      select: {
        id: true,
        studentId: true,
        startDate: true,
        dueDate: true,
        completedAt: true,
        plan: {
          select: {
            title: true,
            subjectId: true,
            subject: { select: { name: true, parent: { select: { name: true } } } },
          },
        },
        version: { select: { items: { select: { id: true, isRequired: true, lessonId: true } } } },
        progress: { select: { itemId: true } },
      },
    }),
    prisma.examAssignment.findMany({
      where: { studentId: { in: studentIds }, status: "ACTIVE" },
      select: {
        id: true,
        studentId: true,
        examId: true,
        availableFrom: true,
        dueDate: true,
        exam: {
          select: {
            title: true,
            availableFrom: true,
            availableUntil: true,
            subject: { select: { name: true, parent: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.examAttempt.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, examId: true, status: true },
    }),
  ]);

  for (const a of planRows) {
    const done = new Set(a.progress.map((p) => p.itemId));
    const items = a.version.items;
    const required = items.filter((i) => i.isRequired);
    result.get(a.studentId)?.plans.push({
      assignmentId: a.id,
      planTitle: a.plan.title,
      subjectId: a.plan.subjectId,
      subjectName: subjectLabel(a.plan.subject),
      startDate: a.startDate,
      dueDate: a.dueDate,
      completedAt: a.completedAt,
      requiredTotal: required.length,
      requiredDone: required.filter((i) => done.has(i.id)).length,
      itemsDone: items.filter((i) => done.has(i.id)).length,
      lessonIdsDone: items.filter((i) => done.has(i.id) && i.lessonId).map((i) => i.lessonId as string),
    });
  }

  const attemptsByKey = new Map<string, { inProgress: boolean; ended: number }>();
  for (const t of attemptRows) {
    const key = `${t.studentId}:${t.examId}`;
    const entry = attemptsByKey.get(key) ?? { inProgress: false, ended: 0 };
    if (t.status === "IN_PROGRESS") entry.inProgress = true;
    else entry.ended += 1;
    attemptsByKey.set(key, entry);
  }

  for (const a of examRows) {
    const window = examWindow({
      now,
      assignmentFrom: a.availableFrom,
      dueDate: a.dueDate,
      examFrom: a.exam.availableFrom,
      examUntil: a.exam.availableUntil,
    });
    const attempts = attemptsByKey.get(`${a.studentId}:${a.examId}`) ?? { inProgress: false, ended: 0 };
    result.get(a.studentId)?.exams.push({
      assignmentId: a.id,
      examTitle: a.exam.title,
      subjectName: subjectLabel(a.exam.subject),
      opensAt: window.opensAt,
      closesAt: window.closesAt,
      inProgress: attempts.inProgress,
      endedAttempts: attempts.ended,
    });
  }

  return result;
}

export async function loadStudentProgress(studentId: string): Promise<{
  plans: PlanFact[];
  exams: ExamFact[];
  activity: ActivityItem[];
}> {
  const [many, lessonRows, attemptRows] = await Promise.all([
    loadProgressMany([studentId]),
    prisma.lessonPlanItemProgress.findMany({
      where: { assignment: { studentId } },
      orderBy: { completedAt: "desc" },
      take: 8,
      select: {
        completedAt: true,
        item: { select: { lesson: { select: { title: true } } } },
        assignment: { select: { plan: { select: { title: true } } } },
      },
    }),
    prisma.examAttempt.findMany({
      where: { studentId, status: { not: "IN_PROGRESS" } },
      orderBy: { startedAt: "desc" },
      take: 8,
      select: { attemptNumber: true, submittedAt: true, exam: { select: { title: true } } },
    }),
  ]);

  const mine = many.get(studentId) ?? { plans: [], exams: [] };

  // Recent activity: lessons completed and exams submitted. Never any scores.
  const activity: ActivityItem[] = [
    ...lessonRows.flatMap((r) =>
      r.item.lesson
        ? [{ kind: "LESSON" as const, title: r.item.lesson.title, detail: `Completed in ${r.assignment.plan.title}`, at: r.completedAt }]
        : []
    ),
    ...attemptRows.flatMap((t) =>
      t.submittedAt
        ? [{ kind: "EXAM" as const, title: t.exam.title, detail: `Finished attempt ${t.attemptNumber}`, at: t.submittedAt }]
        : []
    ),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return { plans: mine.plans, exams: mine.exams, activity };
}