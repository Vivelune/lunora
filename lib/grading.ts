import { normalizeAnswer } from "./answers";
import { toHundredths } from "./points";
import { QuestionTypeValue } from "./question-input";


export type GradableQuestion = {
  id: string;
  type: QuestionTypeValue;
  points: string;
  correctOptionIds: string[];
  acceptedAnswers: string[];
};

export type GivenAnswer = { selectedOptionIds: string[]; textAnswer: string | null } | undefined;

export type QuestionGrade = {
  questionId: string;
  answered: boolean;
  correct: boolean;
  awardedHundredths: number;
  possibleHundredths: number;
};

/** Grades one question. All-or-nothing: the answer is either exactly right or earns zero. */
export function gradeQuestion(question: GradableQuestion, given: GivenAnswer): QuestionGrade {
  const possibleHundredths = toHundredths(question.points);
  let answered = false;
  let correct = false;

  if (question.type === "SHORT_ANSWER") {
    const text = normalizeAnswer(given?.textAnswer ?? "");
    answered = text !== "";
    correct =
      answered &&
      question.acceptedAnswers.some((accepted) => {
        const normalized = normalizeAnswer(accepted);
        return normalized !== "" && normalized === text;
      });
  } else {
    const selected = new Set(given?.selectedOptionIds ?? []);
    const key = new Set(question.correctOptionIds);
    answered = selected.size > 0;
    correct =
      answered &&
      key.size > 0 &&
      selected.size === key.size &&
      [...selected].every((id) => key.has(id));
  }

  return {
    questionId: question.id,
    answered,
    correct,
    awardedHundredths: correct ? possibleHundredths : 0,
    possibleHundredths,
  };
}

export type Totals = {
  earnedHundredths: number;
  possibleHundredths: number;
  /** 7025 means 70.25%. */
  percentageHundredths: number;
  /** null when the exam has no passing mark. */
  passed: boolean | null;
};

export function totalsFor(grades: QuestionGrade[], passingPercent: number | null): Totals {
  const earned = grades.reduce((sum, g) => sum + g.awardedHundredths, 0);
  const possible = grades.reduce((sum, g) => sum + g.possibleHundredths, 0);

  // earned / possible * 10000, rounded half up, using whole numbers only.
  const percentageHundredths = possible === 0 ? 0 : Math.floor((earned * 20000 + possible) / (possible * 2));

  // The pass mark is compared with the UNROUNDED percentage: earned/possible*100 >= passing.
  const passed = passingPercent === null || possible === 0 ? null : earned * 100 >= passingPercent * possible;

  return { earnedHundredths: earned, possibleHundredths: possible, percentageHundredths, passed };
}

/** 150 becomes "1.50", 5 becomes "0.05". Exact, no floating point. */
export function hundredthsToDecimal(hundredths: number): string {
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
}