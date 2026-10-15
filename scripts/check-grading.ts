import assert from "node:assert/strict";
import { gradeQuestion, hundredthsToDecimal, totalsFor, type GradableQuestion, type QuestionGrade } from "../lib/grading";

const single: GradableQuestion = { id: "q1", type: "SINGLE_CHOICE", points: "1", correctOptionIds: ["a"], acceptedAnswers: [] };
const multi: GradableQuestion = { id: "q2", type: "MULTIPLE_SELECT", points: "2", correctOptionIds: ["a", "c"], acceptedAnswers: [] };
const tf: GradableQuestion = { id: "q3", type: "TRUE_FALSE", points: "0.5", correctOptionIds: ["f"], acceptedAnswers: [] };
const short: GradableQuestion = { id: "q4", type: "SHORT_ANSWER", points: "1.5", correctOptionIds: [], acceptedAnswers: ["7", "seven"] };
const pick = (...ids: string[]) => ({ selectedOptionIds: ids, textAnswer: null });
const typed = (text: string | null) => ({ selectedOptionIds: [], textAnswer: text });

// Single choice and true/false.
assert.deepEqual(gradeQuestion(single, pick("a")), { questionId: "q1", answered: true, correct: true, awardedHundredths: 100, possibleHundredths: 100 });
assert.equal(gradeQuestion(single, pick("b")).correct, false);
assert.equal(gradeQuestion(single, pick("b")).awardedHundredths, 0);
assert.equal(gradeQuestion(single, pick()).answered, false);
assert.equal(gradeQuestion(single, undefined).answered, false);
assert.equal(gradeQuestion(single, pick("a", "b")).correct, false);
assert.equal(gradeQuestion(tf, pick("f")).awardedHundredths, 50);
assert.equal(gradeQuestion(tf, pick("t")).awardedHundredths, 0);

// Multiple select: exact match only, in any order.
assert.equal(gradeQuestion(multi, pick("a", "c")).correct, true);
assert.equal(gradeQuestion(multi, pick("c", "a")).correct, true);
assert.equal(gradeQuestion(multi, pick("a")).correct, false, "partial selection earns nothing");
assert.equal(gradeQuestion(multi, pick("a", "c", "b")).correct, false, "extra selection earns nothing");
assert.equal(gradeQuestion(multi, pick("b", "d")).correct, false);
assert.equal(gradeQuestion(multi, pick("a")).answered, true);

// A question with no correct option can never be "correct".
const broken: GradableQuestion = { id: "qx", type: "SINGLE_CHOICE", points: "1", correctOptionIds: [], acceptedAnswers: [] };
assert.equal(gradeQuestion(broken, pick()).correct, false);
assert.equal(gradeQuestion(broken, pick("a")).correct, false);

// Short answers: trim, collapse spaces, ignore capitals.
assert.equal(gradeQuestion(short, typed("7")).correct, true);
assert.equal(gradeQuestion(short, typed("  SEVEN ")).correct, true);
assert.equal(gradeQuestion(short, typed("Seven")).awardedHundredths, 150);
assert.equal(gradeQuestion(short, typed("7.0")).correct, false);
assert.equal(gradeQuestion(short, typed("seven  ")).correct, true);
assert.equal(gradeQuestion(short, typed("")).answered, false);
assert.equal(gradeQuestion(short, typed("   ")).answered, false);
assert.equal(gradeQuestion(short, typed(null)).answered, false);
const spaced: GradableQuestion = { ...short, acceptedAnswers: ["new york"] };
assert.equal(gradeQuestion(spaced, typed("New   York")).correct, true);

// Totals use exact whole-number math.
const grade = (awarded: number, possible: number): QuestionGrade => ({
  questionId: "x", answered: true, correct: awarded > 0, awardedHundredths: awarded, possibleHundredths: possible,
});

const decimals = totalsFor([grade(10, 10), grade(20, 20)], null);
assert.equal(decimals.earnedHundredths, 30, "0.1 + 0.2 is exactly 0.3");
assert.equal(decimals.percentageHundredths, 10000);
assert.equal(decimals.passed, null, "no passing mark means no pass or fail");

// Percentage rounding: half up, two decimals.
assert.equal(totalsFor([grade(100, 300)], null).percentageHundredths, 3333);
assert.equal(totalsFor([grade(200, 300)], null).percentageHundredths, 6667);
assert.equal(totalsFor([grade(100, 800)], null).percentageHundredths, 1250);
assert.equal(totalsFor([grade(1, 20000)], null).percentageHundredths, 1, "exactly 0.005 rounds up");
assert.equal(totalsFor([grade(0, 450)], null).percentageHundredths, 0);
assert.equal(totalsFor([grade(450, 450)], null).percentageHundredths, 10000);
assert.equal(totalsFor([grade(400, 1050)], null).percentageHundredths, 3810);

// Passing mark uses the UNROUNDED percentage.
const nearly = totalsFor([grade(17499, 25000)], 70); // 69.996 %, which displays as 70.00
assert.equal(nearly.percentageHundredths, 7000);
assert.equal(nearly.passed, false, "69.996% must not pass a 70% mark");
assert.equal(totalsFor([grade(17500, 25000)], 70).passed, true, "exactly 70% passes");
assert.equal(totalsFor([grade(0, 100)], 1).passed, false);
assert.equal(totalsFor([grade(100, 100)], 100).passed, true);

// An exam with nothing possible does not divide by zero.
const empty = totalsFor([], 50);
assert.equal(empty.percentageHundredths, 0);
assert.equal(empty.passed, null);

// Decimal strings are exact.
assert.equal(hundredthsToDecimal(150), "1.50");
assert.equal(hundredthsToDecimal(5), "0.05");
assert.equal(hundredthsToDecimal(10000), "100.00");
assert.equal(hundredthsToDecimal(0), "0.00");
assert.equal(hundredthsToDecimal(3810), "38.10");

console.log("All grading checks passed.");