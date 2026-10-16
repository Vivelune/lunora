export type AttemptFact = {
    attemptId: string;
    examId: string;
    examTitle: string;
    subjectId: string;
    subjectName: string;
    assigned: boolean;
    endedAt: Date;
    earnedHundredths: number;
    possibleHundredths: number;
  };
  
  export type AnswerFact = {
    attemptId: string;
    categoryId: string;
    categoryName: string;
    subjectId: string;
    awardedHundredths: number;
    possibleHundredths: number;
  };
  
  export const MIN_TOPIC_QUESTIONS = 5;
  export const STRONG_AT = 8000; // 80.00%
  export const ATTENTION_BELOW = 6000; // 60.00%
  
  const usable = (f: AttemptFact) => f.possibleHundredths > 0 && f.earnedHundredths >= 0;
  
  /** 7025 means 70.25%. Half-up, whole-number math (the same rule used for grading). */
  export function percentHundredths(earned: number, possible: number): number {
    return possible <= 0 ? 0 : Math.floor((earned * 20000 + possible) / (possible * 2));
  }
  
  /** Which attempt has the higher UNROUNDED ratio: 1 if a is higher, -1 if b is, 0 if equal. */
  function compareRatio(a: AttemptFact, b: AttemptFact): number {
    const left = a.earnedHundredths * b.possibleHundredths;
    const right = b.earnedHundredths * a.possibleHundredths;
    return left === right ? 0 : left > right ? 1 : -1;
  }
  
  /** Newer first for ties, so results are stable. */
  function newer(a: AttemptFact, b: AttemptFact): boolean {
    const diff = a.endedAt.getTime() - b.endedAt.getTime();
    return diff !== 0 ? diff > 0 : a.attemptId > b.attemptId;
  }
  
  function isBetter(candidate: AttemptFact, current: AttemptFact): boolean {
    const cmp = compareRatio(candidate, current);
    return cmp > 0 || (cmp === 0 && newer(candidate, current));
  }
  
  /** Each exam's best attempt (highest ratio; the newer one if tied). */
  export function bestPerExam(attempts: AttemptFact[]): AttemptFact[] {
    const best = new Map<string, AttemptFact>();
    for (const attempt of attempts.filter(usable)) {
      const current = best.get(attempt.examId);
      if (!current || isBetter(attempt, current)) best.set(attempt.examId, attempt);
    }
    return [...best.values()];
  }
  
  export type Summary = {
    attempts: number;
    assignedAttempts: number;
    practiceAttempts: number;
    examsCompleted: number;
    latest: AttemptFact | null;
    best: AttemptFact | null;
    /** null when there is nothing to average. */
    averageHundredths: number | null;
    weightedEarned: number;
    weightedPossible: number;
  };
  
  export function summarize(all: AttemptFact[]): Summary {
    const attempts = all.filter(usable);
  
    let latest: AttemptFact | null = null;
    let best: AttemptFact | null = null;
    for (const attempt of attempts) {
      if (!latest || newer(attempt, latest)) latest = attempt;
      if (!best || isBetter(attempt, best)) best = attempt;
    }
  
    const bests = bestPerExam(attempts);
    const weightedEarned = bests.reduce((sum, a) => sum + a.earnedHundredths, 0);
    const weightedPossible = bests.reduce((sum, a) => sum + a.possibleHundredths, 0);
  
    return {
      attempts: attempts.length,
      assignedAttempts: attempts.filter((a) => a.assigned).length,
      practiceAttempts: attempts.filter((a) => !a.assigned).length,
      examsCompleted: new Set(attempts.map((a) => a.examId)).size,
      latest,
      best,
      averageHundredths: weightedPossible > 0 ? percentHundredths(weightedEarned, weightedPossible) : null,
      weightedEarned,
      weightedPossible,
    };
  }
  
  export type SubjectSummary = { subjectId: string; subjectName: string; summary: Summary };
  
  export function bySubject(all: AttemptFact[]): SubjectSummary[] {
    const groups = new Map<string, { name: string; items: AttemptFact[] }>();
    for (const attempt of all.filter(usable)) {
      const group = groups.get(attempt.subjectId) ?? { name: attempt.subjectName, items: [] };
      group.items.push(attempt);
      groups.set(attempt.subjectId, group);
    }
    return [...groups.entries()]
      .map(([subjectId, g]) => ({ subjectId, subjectName: g.name, summary: summarize(g.items) }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }
  
  export type TrendPoint = {
    attemptId: string;
    endedAt: Date;
    examTitle: string;
    subjectName: string;
    assigned: boolean;
    percentHundredths: number;
  };
  
  /** Every eligible attempt, oldest first. The trend shows ALL attempts, not just the best ones. */
  export function trendPoints(all: AttemptFact[]): TrendPoint[] {
    return all
      .filter(usable)
      .sort((a, b) => (newer(a, b) ? 1 : -1))
      .map((a) => ({
        attemptId: a.attemptId,
        endedAt: a.endedAt,
        examTitle: a.examTitle,
        subjectName: a.subjectName,
        assigned: a.assigned,
        percentHundredths: percentHundredths(a.earnedHundredths, a.possibleHundredths),
      }));
  }
  
  export type TopicLabel = "STRONG" | "DEVELOPING" | "NEEDS_ATTENTION";
  
  export function topicLabel(percent: number): TopicLabel {
    if (percent >= STRONG_AT) return "STRONG";
    if (percent < ATTENTION_BELOW) return "NEEDS_ATTENTION";
    return "DEVELOPING";
  }
  
  export type TopicStat = {
    categoryId: string;
    name: string;
    subjectId: string;
    questions: number;
    earnedHundredths: number;
    possibleHundredths: number;
    percentHundredths: number;
    label: TopicLabel;
  };
  
  /**
   * Per-topic performance over the given attempts (pass each exam's best attempts).
   * A topic is shown only with at least `minQuestions` graded questions. Weakest first.
   */
  export function topicStats(
    answers: AnswerFact[],
    includeAttemptIds: ReadonlySet<string>,
    minQuestions: number = MIN_TOPIC_QUESTIONS
  ): TopicStat[] {
    const groups = new Map<string, Omit<TopicStat, "percentHundredths" | "label">>();
  
    for (const answer of answers) {
      if (!includeAttemptIds.has(answer.attemptId) || answer.possibleHundredths <= 0) continue;
      const group = groups.get(answer.categoryId) ?? {
        categoryId: answer.categoryId,
        name: answer.categoryName,
        subjectId: answer.subjectId,
        questions: 0,
        earnedHundredths: 0,
        possibleHundredths: 0,
      };
      group.questions += 1;
      group.earnedHundredths += answer.awardedHundredths;
      group.possibleHundredths += answer.possibleHundredths;
      groups.set(answer.categoryId, group);
    }
  
    return [...groups.values()]
      .filter((g) => g.questions >= minQuestions)
      .map((g) => {
        const percent = percentHundredths(g.earnedHundredths, g.possibleHundredths);
        return { ...g, percentHundredths: percent, label: topicLabel(percent) };
      })
      .sort((a, b) => a.percentHundredths - b.percentHundredths || a.name.localeCompare(b.name));
  }