import { percentHundredths } from "./analytics-core";

export type PlanFact = {
  assignmentId: string;
  planTitle: string;
  subjectId: string;
  subjectName: string;
  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
  requiredTotal: number;
  requiredDone: number;
  itemsDone: number;
  lessonIdsDone: string[];
};

export type PlanState = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export function planState(fact: PlanFact): PlanState {
  if (fact.completedAt) return "COMPLETED";
  return fact.itemsDone > 0 ? "IN_PROGRESS" : "NOT_STARTED";
}

/** Overdue is calculated, never stored. A completed plan is never overdue, even if finished late. */
export function planOverdue(fact: PlanFact, now: Date): boolean {
  return fact.completedAt === null && fact.dueDate !== null && fact.dueDate.getTime() < now.getTime();
}

export type PlanSummary = {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  requiredDone: number;
  requiredTotal: number;
  /** 7500 means 75%. null when there are no required lessons at all. */
  completionHundredths: number | null;
  lessonsCompleted: number;
};

export function summarizePlans(facts: PlanFact[], now: Date): PlanSummary {
  let requiredDone = 0;
  let requiredTotal = 0;
  const lessons = new Set<string>();

  for (const fact of facts) {
    requiredTotal += fact.requiredTotal;
    requiredDone += Math.min(fact.requiredDone, fact.requiredTotal);
    fact.lessonIdsDone.forEach((id) => lessons.add(id));
  }

  return {
    total: facts.length,
    notStarted: facts.filter((f) => planState(f) === "NOT_STARTED").length,
    inProgress: facts.filter((f) => planState(f) === "IN_PROGRESS").length,
    completed: facts.filter((f) => planState(f) === "COMPLETED").length,
    overdue: facts.filter((f) => planOverdue(f, now)).length,
    requiredDone,
    requiredTotal,
    completionHundredths: requiredTotal > 0 ? percentHundredths(requiredDone, requiredTotal) : null,
    lessonsCompleted: lessons.size,
  };
}

export function plansBySubject(facts: PlanFact[], now: Date) {
  const groups = new Map<string, { name: string; items: PlanFact[] }>();
  for (const fact of facts) {
    const group = groups.get(fact.subjectId) ?? { name: fact.subjectName, items: [] };
    group.items.push(fact);
    groups.set(fact.subjectId, group);
  }
  return [...groups.entries()]
    .map(([subjectId, g]) => ({ subjectId, subjectName: g.name, summary: summarizePlans(g.items, now) }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

export type ExamFact = {
  assignmentId: string;
  examTitle: string;
  subjectName: string;
  opensAt: Date | null;
  closesAt: Date | null;
  inProgress: boolean;
  endedAttempts: number;
};

export type ExamProgressState = "IN_PROGRESS" | "COMPLETED" | "MISSED" | "UPCOMING" | "NOT_STARTED";

export function examProgressState(fact: ExamFact, now: Date): ExamProgressState {
  if (fact.inProgress) return "IN_PROGRESS";
  if (fact.endedAttempts > 0) return "COMPLETED";
  if (fact.closesAt && now.getTime() > fact.closesAt.getTime()) return "MISSED";
  if (fact.opensAt && now.getTime() < fact.opensAt.getTime()) return "UPCOMING";
  return "NOT_STARTED";
}

export type ExamProgressSummary = {
  total: number;
  /** Exams with at least one finished attempt, even if a retake is running. */
  completed: number;
  inProgress: number;
  notStarted: number;
  upcoming: number;
  missed: number;
};

export function summarizeExams(facts: ExamFact[], now: Date): ExamProgressSummary {
  const count = (state: ExamProgressState) => facts.filter((f) => examProgressState(f, now) === state).length;
  return {
    total: facts.length,
    completed: facts.filter((f) => f.endedAttempts > 0).length,
    inProgress: facts.filter((f) => f.inProgress).length,
    notStarted: count("NOT_STARTED"),
    upcoming: count("UPCOMING"),
    missed: count("MISSED"),
  };
}