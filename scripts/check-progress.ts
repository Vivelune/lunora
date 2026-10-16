import assert from "node:assert/strict";
import {
  examProgressState,
  planOverdue,
  planState,
  plansBySubject,
  summarizeExams,
  summarizePlans,
  type ExamFact,
  type PlanFact,
} from "../lib/progress-core";

const now = new Date("2026-10-15T12:00:00Z");
const past = new Date("2026-10-01T00:00:00Z");
const future = new Date("2026-10-30T00:00:00Z");

let n = 0;
function plan(over: Partial<PlanFact>): PlanFact {
  n += 1;
  return {
    assignmentId: `p${n}`,
    planTitle: `Plan ${n}`,
    subjectId: over.subjectId ?? "math",
    subjectName: over.subjectName ?? "SAT Mathematics",
    startDate: null,
    dueDate: null,
    completedAt: null,
    requiredTotal: 2,
    requiredDone: 0,
    itemsDone: 0,
    lessonIdsDone: [],
    ...over,
  };
}

// States.
assert.equal(planState(plan({})), "NOT_STARTED");
assert.equal(planState(plan({ itemsDone: 1, requiredDone: 1 })), "IN_PROGRESS");
assert.equal(planState(plan({ itemsDone: 2, requiredDone: 2, completedAt: now })), "COMPLETED");

// Overdue is calculated, and completion beats lateness.
assert.equal(planOverdue(plan({ dueDate: past }), now), true);
assert.equal(planOverdue(plan({ dueDate: future }), now), false);
assert.equal(planOverdue(plan({}), now), false, "no due date is never overdue");
assert.equal(planOverdue(plan({ dueDate: past, completedAt: now }), now), false, "finished late stays completed, not overdue");

// Completion is required lessons done over required lessons. Optional ones are ignored.
const facts = [
  plan({ requiredTotal: 2, requiredDone: 1, itemsDone: 2, lessonIdsDone: ["l1", "l2"], dueDate: past }),
  plan({ requiredTotal: 2, requiredDone: 2, itemsDone: 2, lessonIdsDone: ["l2", "l3"], completedAt: now, dueDate: past }),
  plan({ requiredTotal: 4, requiredDone: 0 }),
];
const s = summarizePlans(facts, now);
assert.equal(s.total, 3);
assert.equal(s.completed, 1);
assert.equal(s.inProgress, 1);
assert.equal(s.notStarted, 1);
assert.equal(s.overdue, 1, "only the unfinished plan past its due date is overdue");
assert.equal(s.requiredDone, 3);
assert.equal(s.requiredTotal, 8);
assert.equal(s.completionHundredths, 3750, "3 of 8 required lessons is 37.5%");
assert.equal(s.lessonsCompleted, 3, "l2 appears twice but counts once");

// Nothing assigned.
const none = summarizePlans([], now);
assert.equal(none.completionHundredths, null);
assert.equal(none.lessonsCompleted, 0);

// A bad count can never push completion above 100%.
assert.equal(summarizePlans([plan({ requiredTotal: 2, requiredDone: 5, completedAt: now, itemsDone: 5 })], now).completionHundredths, 10000);

// By subject.
const bySubject = plansBySubject(
  [plan({ subjectId: "chem", subjectName: "AP Chemistry", requiredTotal: 1, requiredDone: 1, completedAt: now, itemsDone: 1 }), plan({ requiredTotal: 2, requiredDone: 1, itemsDone: 1 })],
  now
);
assert.deepEqual(bySubject.map((x) => x.subjectName), ["AP Chemistry", "SAT Mathematics"]);
assert.equal(bySubject[0].summary.completionHundredths, 10000);
assert.equal(bySubject[1].summary.completionHundredths, 5000);

// Exams.
const exam = (over: Partial<ExamFact>): ExamFact => ({
  assignmentId: "x",
  examTitle: "E",
  subjectName: "S",
  opensAt: null,
  closesAt: null,
  inProgress: false,
  endedAttempts: 0,
  ...over,
});
assert.equal(examProgressState(exam({}), now), "NOT_STARTED");
assert.equal(examProgressState(exam({ opensAt: future }), now), "UPCOMING");
assert.equal(examProgressState(exam({ closesAt: past }), now), "MISSED");
assert.equal(examProgressState(exam({ closesAt: past, endedAttempts: 1 }), now), "COMPLETED", "an attempt before the deadline is completed, not missed");
assert.equal(examProgressState(exam({ inProgress: true }), now), "IN_PROGRESS");
assert.equal(examProgressState(exam({ inProgress: true, endedAttempts: 1 }), now), "IN_PROGRESS", "a retake in progress shows as in progress");

const es = summarizeExams(
  [exam({}), exam({ opensAt: future }), exam({ closesAt: past }), exam({ endedAttempts: 2 }), exam({ inProgress: true, endedAttempts: 1 })],
  now
);
assert.deepEqual(es, { total: 5, completed: 2, inProgress: 1, notStarted: 1, upcoming: 1, missed: 1 });

console.log("All progress checks passed.");