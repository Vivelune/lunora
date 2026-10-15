import assert from "node:assert/strict";
import { sameAnswerContent, validateAnswer } from "../lib/answer-input";

const choice = { type: "SINGLE_CHOICE" as const, optionIds: ["a", "b", "c", "d"] };
const multi = { type: "MULTIPLE_SELECT" as const, optionIds: ["a", "b", "c", "d"] };
const tf = { type: "TRUE_FALSE" as const, optionIds: ["t", "f"] };
const short = { type: "SHORT_ANSWER" as const, optionIds: [] };
const ok = (r: ReturnType<typeof validateAnswer>) => r.ok;

// Valid answers.
assert.ok(ok(validateAnswer({ selectedOptionIds: ["a"], textAnswer: "", flagged: false }, choice)));
assert.ok(ok(validateAnswer({ selectedOptionIds: [], textAnswer: "", flagged: true }, choice)));
assert.ok(ok(validateAnswer({ selectedOptionIds: ["a", "c"], textAnswer: "", flagged: false }, multi)));
assert.ok(ok(validateAnswer({ selectedOptionIds: ["t"], textAnswer: "", flagged: false }, tf)));
assert.ok(ok(validateAnswer({ selectedOptionIds: [], textAnswer: "45", flagged: false }, short)));
assert.ok(ok(validateAnswer({ selectedOptionIds: [], textAnswer: "", flagged: false }, short)));

// An option that does not belong to the question.
assert.equal(ok(validateAnswer({ selectedOptionIds: ["zzz"], textAnswer: "", flagged: false }, choice)), false);
// Two options on a single-choice question.
assert.equal(ok(validateAnswer({ selectedOptionIds: ["a", "b"], textAnswer: "", flagged: false }, choice)), false);
// Duplicate ids.
assert.equal(ok(validateAnswer({ selectedOptionIds: ["a", "a"], textAnswer: "", flagged: false }, multi)), false);
// Text on a choice question.
assert.equal(ok(validateAnswer({ selectedOptionIds: [], textAnswer: "x", flagged: false }, choice)), false);
// Options on a short-answer question.
assert.equal(ok(validateAnswer({ selectedOptionIds: ["a"], textAnswer: "", flagged: false }, short)), false);
// Too long.
assert.equal(ok(validateAnswer({ selectedOptionIds: [], textAnswer: "x".repeat(201), flagged: false }, short)), false);
// Wrong types.
assert.equal(ok(validateAnswer({ selectedOptionIds: "a", textAnswer: "", flagged: false }, choice)), false);
assert.equal(ok(validateAnswer({ selectedOptionIds: [1], textAnswer: "", flagged: false }, choice)), false);
assert.equal(ok(validateAnswer({ selectedOptionIds: [], textAnswer: 5, flagged: false }, short)), false);
assert.equal(ok(validateAnswer({ selectedOptionIds: [], textAnswer: "", flagged: "yes" }, short)), false);

// Equality ignores option order.
const x = { selectedOptionIds: ["a", "b"], textAnswer: "", flagged: false };
assert.ok(sameAnswerContent(x, { ...x, selectedOptionIds: ["b", "a"] }));
assert.equal(sameAnswerContent(x, { ...x, flagged: true }), false);
assert.equal(sameAnswerContent(x, { ...x, selectedOptionIds: ["a"] }), false);
assert.equal(sameAnswerContent(x, { ...x, textAnswer: "t" }), false);

console.log("All answer input checks passed.");