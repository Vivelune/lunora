import "server-only";
import prisma from "./prisma";
import { examWindow } from "./exam-window";
import type { ExamFact, PlanFact } from "./progress-core";

export type ActivityItem = { kind: "LESSON" | "EXAM"; title: string; detail: string; at: Date };

const subjectLabel = (s: { name: string; parent: { name: string } | null }) =>
  s.parent ? `${s.parent.name} ${s.name}` : s.name;

export async function loadStudentProgress(studentId: string): Promise<{
  plans: PlanFact[];
  exams: ExamFact[];
  activity: ActivityItem[];
}> {
  const now = new Date();

  const [planRows, examRows, lessonRows, attemptRows] = await Promise.all([
    prisma.lessonPlanAssignment.findMany({
      where: { studentId, status: "ACTIVE" },
      select: {
        id: true,
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
      where: { studentId, status: "ACTIVE" },
      select: {
        id: true,
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
      where: { studentId },
      orderBy: { startedAt: "desc" },
      select: {
        examId: true,
        status: true,
        attemptNumber: true,
        submittedAt: true,
        exam: { select: { title: true } },
      },
    }),
  ]);

  const plans: PlanFact[] = planRows.map((a) => {
    const done = new Set(a.progress.map((p) => p.itemId));
    const items = a.version.items;
    const required = items.filter((i) => i.isRequired);
    return {
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
    };
  });

  const exams: ExamFact[] = examRows.map((a) => {
    const attempts = attemptRows.filter((t) => t.examId === a.examId);
    const window = examWindow({
      now,
      assignmentFrom: a.availableFrom,
      dueDate: a.dueDate,
      examFrom: a.exam.availableFrom,
      examUntil: a.exam.availableUntil,
    });
    return {
      assignmentId: a.id,
      examTitle: a.exam.title,
      subjectName: subjectLabel(a.exam.subject),
      opensAt: window.opensAt,
      closesAt: window.closesAt,
      inProgress: attempts.some((t) => t.status === "IN_PROGRESS"),
      endedAttempts: attempts.filter((t) => t.status !== "IN_PROGRESS").length,
    };
  });

  // Recent activity: lessons completed and exams submitted. Never any scores.
  const activity: ActivityItem[] = [
    ...lessonRows.flatMap((r) =>
      r.item.lesson
        ? [{ kind: "LESSON" as const, title: r.item.lesson.title, detail: `Completed in ${r.assignment.plan.title}`, at: r.completedAt }]
        : []
    ),
    ...attemptRows.flatMap((t) =>
      t.status !== "IN_PROGRESS" && t.submittedAt
        ? [{ kind: "EXAM" as const, title: t.exam.title, detail: `Finished attempt ${t.attemptNumber}`, at: t.submittedAt }]
        : []
    ),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return { plans, exams, activity };
}