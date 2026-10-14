import "server-only";
import prisma from "./prisma";
import { examWindow } from "./exam-window";

export type StudentExamCard = {
  key: string;
  kind: "ASSIGNED" | "PRACTICE";
  title: string;
  subject: string;
  description: string | null;
  durationMinutes: number;
  attemptsAllowed: number;
  questionCount: number;
  totalPoints: string;
  passingPercent: number | null;
  instructions: string | null;
  opensAt: Date | null;
  closesAt: Date | null;
  state: "UPCOMING" | "AVAILABLE" | "CLOSED" | "UNAVAILABLE";
  examId: string;
  assignmentId: string | null;
  attemptsUsed: number;
  inProgressAttemptId: string | null;
};

type SubjectShape = { name: string; parent: { name: string } | null };
const subjectLabel = (s: SubjectShape) => (s.parent ? `${s.parent.name} ${s.name}` : s.name);

/** Question count and total points per version. Counts and sums only; never question content. */
async function versionTotals(versionIds: string[]) {
  const totals = new Map<string, { count: number; points: string }>();
  if (versionIds.length === 0) return totals;

  const groups = await prisma.question.groupBy({
    by: ["versionId"],
    where: { versionId: { in: versionIds } },
    _count: { _all: true },
    _sum: { points: true },
  });
  for (const g of groups) {
    totals.set(g.versionId, { count: g._count._all, points: g._sum.points?.toString() ?? "0" });
  }
  return totals;
}

const STATE_ORDER = { AVAILABLE: 0, UPCOMING: 1, CLOSED: 2, UNAVAILABLE: 3 } as const;

export async function getStudentExams(studentId: string): Promise<{
  assigned: StudentExamCard[];
  practice: StudentExamCard[];
}> {
  const now = new Date();

  const assignments = await prisma.examAssignment.findMany({
    where: { studentId, status: "ACTIVE" },
    select: {
      id: true,
      availableFrom: true,
      dueDate: true,
      maxAttemptsOverride: true,
      instructions: true,
      exam: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          availableFrom: true,
          availableUntil: true,
          subject: { select: { name: true, parent: { select: { name: true } } } },
        },
      },
      version: { select: { id: true, durationMinutes: true, maxAttempts: true, passingPercent: true } },
    },
  });

  const assignedExamIds = assignments.map((a) => a.exam.id);

  const practiceExams = await prisma.exam.findMany({
    where: {
      visibility: "OPEN_PRACTICE",
      status: "PUBLISHED",
      id: { notIn: assignedExamIds },
      versions: { some: { publishedAt: { not: null } } },
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      availableFrom: true,
      availableUntil: true,
      subject: { select: { name: true, parent: { select: { name: true } } } },
      versions: {
        where: { publishedAt: { not: null } },
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { id: true, durationMinutes: true, maxAttempts: true, passingPercent: true },
      },
    },
  });

  const versionIds = [
    ...assignments.map((a) => a.version.id),
    ...practiceExams.flatMap((e) => e.versions.map((v) => v.id)),
  ];
  const totals = await versionTotals(versionIds);
  const examIds = [...assignedExamIds, ...practiceExams.map((e) => e.id)];
  const attempts =
    examIds.length === 0
      ? []
      : await prisma.examAttempt.findMany({
          where: { studentId, examId: { in: examIds } },
          select: { id: true, examId: true, status: true },
        });
  const usedByExam = new Map<string, number>();
  const inProgressByExam = new Map<string, string>();
  for (const a of attempts) {
    usedByExam.set(a.examId, (usedByExam.get(a.examId) ?? 0) + 1);
    if (a.status === "IN_PROGRESS") inProgressByExam.set(a.examId, a.id);
  }
  const assigned: StudentExamCard[] = assignments
    .map((a) => {
      const window = examWindow({
        now,
        assignmentFrom: a.availableFrom,
        dueDate: a.dueDate,
        examFrom: a.exam.availableFrom,
        examUntil: a.exam.availableUntil,
      });
      const t = totals.get(a.version.id);
      return {
        key: a.id,
        examId: a.exam.id,
        assignmentId: a.id,
        attemptsUsed: usedByExam.get(a.exam.id) ?? 0,
        inProgressAttemptId: inProgressByExam.get(a.exam.id) ?? null,
        kind: "ASSIGNED" as const,
        title: a.exam.title,
        subject: subjectLabel(a.exam.subject),
        description: a.exam.description,
        durationMinutes: a.version.durationMinutes,
        attemptsAllowed: a.maxAttemptsOverride ?? a.version.maxAttempts,
        questionCount: t?.count ?? 0,
        totalPoints: t?.points ?? "0",
        passingPercent: a.version.passingPercent,
        instructions: a.instructions,
        opensAt: window.opensAt,
        closesAt: window.closesAt,
        state: a.exam.status === "PUBLISHED" ? window.state : ("UNAVAILABLE" as const),
        
      };
    })
    .sort((x, y) => {
      if (STATE_ORDER[x.state] !== STATE_ORDER[y.state]) return STATE_ORDER[x.state] - STATE_ORDER[y.state];
      return (x.closesAt?.getTime() ?? Infinity) - (y.closesAt?.getTime() ?? Infinity);
    });

  const practice: StudentExamCard[] = practiceExams.flatMap((e) => {
    const version = e.versions[0];
    if (!version) return [];
    const window = examWindow({ now, examFrom: e.availableFrom, examUntil: e.availableUntil });
    if (window.state === "CLOSED") return [];
    const t = totals.get(version.id);
    return [
      {
        key: e.id,
        examId: e.id,
        assignmentId: null,
        attemptsUsed: usedByExam.get(e.id) ?? 0,
        inProgressAttemptId: inProgressByExam.get(e.id) ?? null,
        kind: "PRACTICE" as const,
        title: e.title,
        subject: subjectLabel(e.subject),
        description: e.description,
        durationMinutes: version.durationMinutes,
        attemptsAllowed: version.maxAttempts,
        questionCount: t?.count ?? 0,
        totalPoints: t?.points ?? "0",
        passingPercent: version.passingPercent,
        instructions: null,
        opensAt: window.opensAt,
        closesAt: window.closesAt,
        state: window.state,
      },
    ];
  });

  return { assigned, practice };
}