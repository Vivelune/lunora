import "server-only";
import prisma from "./prisma";
import { toHundredths } from "./points";
import { percentHundredths } from "./analytics-core";

export type OverviewActivity = { at: Date; who: string; what: string };

export async function loadAdminOverview() {
  const now = new Date();

  const [
    students,
    onboarded,
    activePlans,
    pendingPlanAssignments,
    overduePlanAssignments,
    missedExamAssignments,
    publishedExams,
    attemptsTotal,
    attemptsInProgress,
    attemptsFlagged,
    attemptsGraded,
    sums,
    recentEnded,
    recentLessons,
    recentStarts,
  ] = await Promise.all([
    prisma.studentProfile.count({ where: { role: "STUDENT" } }),
    prisma.studentProfile.count({ where: { role: "STUDENT", onboardingCompletedAt: { not: null } } }),
    prisma.lessonPlan.count({ where: { status: "PUBLISHED" } }),
    prisma.lessonPlanAssignment.count({ where: { status: "ACTIVE", completedAt: null } }),
    prisma.lessonPlanAssignment.count({ where: { status: "ACTIVE", completedAt: null, dueDate: { lt: now } } }),
    prisma.examAssignment.count({ where: { status: "ACTIVE", dueDate: { lt: now }, attempts: { none: {} } } }),
    prisma.exam.count({ where: { status: "PUBLISHED" } }),
    prisma.examAttempt.count(),
    prisma.examAttempt.count({ where: { status: "IN_PROGRESS" } }),
    prisma.examAttempt.count({ where: { flaggedForReview: true } }),
    prisma.examAttempt.count({ where: { status: "GRADED" } }),
    prisma.examAttempt.aggregate({
      where: { status: "GRADED", pointsPossible: { gt: 0 } },
      _sum: { pointsEarned: true, pointsPossible: true },
    }),
    prisma.examAttempt.findMany({
      where: { status: { not: "IN_PROGRESS" } },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        submittedAt: true,
        pointsEarned: true,
        pointsPossible: true,
        percentage: true,
        flaggedForReview: true,
        student: { select: { firstName: true, lastName: true } },
        exam: { select: { title: true } },
      },
    }),
    prisma.lessonPlanItemProgress.findMany({
      orderBy: { completedAt: "desc" },
      take: 6,
      select: {
        completedAt: true,
        assignment: { select: { student: { select: { firstName: true, lastName: true } } } },
        item: { select: { lesson: { select: { title: true } } } },
      },
    }),
    prisma.examAttempt.findMany({
      orderBy: { startedAt: "desc" },
      take: 6,
      select: {
        startedAt: true,
        attemptNumber: true,
        student: { select: { firstName: true, lastName: true } },
        exam: { select: { title: true } },
      },
    }),
  ]);

  const earned = sums._sum.pointsEarned ? toHundredths(sums._sum.pointsEarned.toString()) : 0;
  const possible = sums._sum.pointsPossible ? toHundredths(sums._sum.pointsPossible.toString()) : 0;

  const name = (s: { firstName: string | null; lastName: string | null }) =>
    `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || "A student";

  const activity: OverviewActivity[] = [
    ...recentLessons.flatMap((r) =>
      r.item.lesson
        ? [{ at: r.completedAt, who: name(r.assignment.student), what: `completed the lesson "${r.item.lesson.title}"` }]
        : []
    ),
    ...recentStarts.map((t) => ({
      at: t.startedAt,
      who: name(t.student),
      what: `started attempt ${t.attemptNumber} of "${t.exam.title}"`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return {
    students,
    onboarded,
    activePlans,
    pendingPlanAssignments,
    overduePlanAssignments,
    missedExamAssignments,
    publishedExams,
    attemptsTotal,
    attemptsInProgress,
    attemptsFlagged,
    attemptsGraded,
    averageHundredths: possible > 0 ? percentHundredths(earned, possible) : null,
    earned,
    possible,
    recentEnded: recentEnded.map((a) => ({ ...a, studentName: name(a.student) })),
    activity,
  };
}