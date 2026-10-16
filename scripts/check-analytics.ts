import assert from "node:assert/strict";
import {
  MIN_TOPIC_QUESTIONS,
  bestPerExam,
  bySubject,
  percentHundredths,
  summarize,
  topicLabel,
  topicStats,
  trendPoints,
  type AnswerFact,
  type AttemptFact,
} from "../lib/analytics-core";

let n = 0;
const day = (d: number) => new Date(Date.UTC(2026, 9, d, 12, 0, 0));
function fact(over: Partial<AttemptFact> & { earned: number; possible: number }): AttemptFact {
  n += 1;
  return {
    attemptId: over.attemptId ?? `a${n}`,
    examId: over.examId ?? "e1",
    examTitle: over.examTitle ?? "Exam 1",
    subjectId: over.subjectId ?? "math",
    subjectName: over.subjectName ?? "SAT Mathematics",
    assigned: over.assigned ?? true,
    endedAt: over.endedAt ?? day(1),
    earnedHundredths: over.earned,
    possibleHundredths: over.possible,
  };
}

// Nothing at all.
const none = summarize([]);
assert.equal(none.attempts, 0);
assert.equal(none.averageHundredths, null);
assert.equal(none.latest, null);
assert.equal(none.best, null);

// One exam, three tries: 40%, 80%, 60% (latest is the 60% one).
const tries = [
  fact({ attemptId: "t1", earned: 400, possible: 1000, endedAt: day(1) }),
  fact({ attemptId: "t2", earned: 800, possible: 1000, endedAt: day(2) }),
  fact({ attemptId: "t3", earned: 600, possible: 1000, endedAt: day(3) }),
];
const s1 = summarize(tries);
assert.equal(s1.attempts, 3);
assert.equal(s1.examsCompleted, 1);
assert.equal(s1.latest?.attemptId, "t3", "latest is the most recent attempt");
assert.equal(s1.best?.attemptId, "t2", "best is the highest single attempt");
assert.equal(s1.averageHundredths, 8000, "the average uses only the best attempt of the exam");
assert.equal(s1.weightedEarned, 800);
assert.equal(s1.weightedPossible, 1000);

// Points-weighted, not an average of percentages: 10 of 10 points (100%) and 0 of 30 points (0%).
const weighted = summarize([
  fact({ examId: "x", earned: 1000, possible: 1000 }),
  fact({ examId: "y", earned: 0, possible: 3000 }),
]);
assert.equal(weighted.averageHundredths, 2500, "10 of 40 points is 25%, not the 50% average of percentages");

// Best uses the exact ratio, not rounded percentages.
const closeCall = bestPerExam([
  fact({ attemptId: "p1", examId: "z", earned: 6667, possible: 10000 }),
  fact({ attemptId: "p2", examId: "z", earned: 2, possible: 3 }), // 66.666...%
]);
assert.equal(closeCall.length, 1);
assert.equal(closeCall[0].attemptId, "p1", "66.67% beats 66.666...%");

// Ties go to the newer attempt.
const tie = bestPerExam([
  fact({ attemptId: "old", examId: "q", earned: 500, possible: 1000, endedAt: day(1) }),
  fact({ attemptId: "new", examId: "q", earned: 500, possible: 1000, endedAt: day(5) }),
]);
assert.equal(tie[0].attemptId, "new");

// Unusable facts are ignored.
const junk = summarize([fact({ earned: 0, possible: 0 }), fact({ earned: -5, possible: 100 })]);
assert.equal(junk.attempts, 0);
assert.equal(junk.averageHundredths, null);

// Assigned vs practice counts.
const mixed = summarize([
  fact({ examId: "m1", earned: 500, possible: 1000, assigned: true }),
  fact({ examId: "m2", earned: 500, possible: 1000, assigned: false }),
  fact({ examId: "m3", earned: 500, possible: 1000, assigned: false }),
]);
assert.equal(mixed.assignedAttempts, 1);
assert.equal(mixed.practiceAttempts, 2);
assert.equal(mixed.examsCompleted, 3);

// Subjects are kept separate.
const subjects = bySubject([
  fact({ examId: "a", subjectId: "chem", subjectName: "AP Chemistry", earned: 900, possible: 1000 }),
  fact({ examId: "b", subjectId: "math", subjectName: "SAT Mathematics", earned: 500, possible: 1000 }),
  fact({ examId: "c", subjectId: "math", subjectName: "SAT Mathematics", earned: 700, possible: 1000 }),
]);
assert.deepEqual(subjects.map((s) => s.subjectName), ["AP Chemistry", "SAT Mathematics"]);
assert.equal(subjects[0].summary.averageHundredths, 9000);
assert.equal(subjects[1].summary.averageHundredths, 6000);
assert.equal(subjects[1].summary.examsCompleted, 2);

// The trend lists every attempt, oldest first.
const trend = trendPoints([
  fact({ attemptId: "late", endedAt: day(9), earned: 100, possible: 200 }),
  fact({ attemptId: "early", endedAt: day(2), earned: 50, possible: 200 }),
]);
assert.deepEqual(trend.map((p) => p.attemptId), ["early", "late"]);
assert.deepEqual(trend.map((p) => p.percentHundredths), [2500, 5000]);

// Percent rounding: half up.
assert.equal(percentHundredths(100, 300), 3333);
assert.equal(percentHundredths(200, 300), 6667);
assert.equal(percentHundredths(1, 20000), 1);
assert.equal(percentHundredths(0, 0), 0);

// Topics: shown only from 5 graded questions, weakest first, using only the included attempts.
const answer = (attemptId: string, categoryId: string, awarded: number, possible = 100): AnswerFact => ({
  attemptId,
  categoryId,
  categoryName: categoryId.toUpperCase(),
  subjectId: "math",
  awardedHundredths: awarded,
  possibleHundredths: possible,
});
const many: AnswerFact[] = [
  ...[1, 1, 1, 0, 0].map((x) => answer("keep", "alg", x * 100)), // 3 of 5 = 60%
  ...[1, 1, 1, 1, 1].map((x) => answer("keep", "geo", x * 100)), // 5 of 5 = 100%
  ...[1, 0, 0, 0, 0].map((x) => answer("keep", "stat", x * 100)), // 1 of 5 = 20%
  ...[1, 1, 1, 1].map((x) => answer("keep", "few", x * 100)), // only 4 questions
  ...[0, 0, 0, 0, 0].map((x) => answer("skip", "alg", x * 100)), // a non-best attempt: ignored
];
const topics = topicStats(many, new Set(["keep"]));
assert.equal(MIN_TOPIC_QUESTIONS, 5);
assert.deepEqual(topics.map((t) => t.categoryId), ["stat", "alg", "geo"], "weakest first; 'few' is hidden");
assert.deepEqual(topics.map((t) => t.percentHundredths), [2000, 6000, 10000]);
assert.deepEqual(topics.map((t) => t.label), ["NEEDS_ATTENTION", "DEVELOPING", "STRONG"]);
assert.equal(topicStats(many, new Set(["keep"]), 4).length, 4, "a lower threshold shows 'few' too");
assert.equal(topicStats(many, new Set()).length, 0, "no included attempts, no topics");

// Decimal points in topics stay exact: 0.5 + 0.5 + 1 of 3 = 100%.
const decimals = [0.5, 0.5, 1, 1, 1].map((p) => answer("d", "dec", Math.round(p * 100), Math.round(p * 100)));
assert.equal(topicStats(decimals, new Set(["d"]))[0].percentHundredths, 10000);

// Label boundaries.
assert.equal(topicLabel(7999), "DEVELOPING");
assert.equal(topicLabel(8000), "STRONG");
assert.equal(topicLabel(5999), "NEEDS_ATTENTION");
assert.equal(topicLabel(6000), "DEVELOPING");

console.log("All analytics checks passed.");