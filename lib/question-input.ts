import { normalizeAnswer } from "./answers";
import { parsePoints } from "./points";

export const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "SHORT_ANSWER"] as const;
export type QuestionTypeValue = (typeof QUESTION_TYPES)[number];

export const TYPE_LABELS: Record<QuestionTypeValue, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_SELECT: "Multiple select",
  TRUE_FALSE: "True / false",
  SHORT_ANSWER: "Short answer",
};

export const MAX_QUESTIONS = 100;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;

export function isQuestionType(value: string): value is QuestionTypeValue {
  return (QUESTION_TYPES as readonly string[]).includes(value);
}

export type RawQuestion = {
  type: QuestionTypeValue;
  prompt: string;
  points: string;
  explanation: string;
  optionTexts: string[];
  correctIndexes: string[];
  trueFalseCorrect: string;
  acceptedAnswers: string;
};

export type CleanQuestion = {
  prompt: string;
  points: string;
  explanation: string | null;
  options: { text: string; isCorrect: boolean }[];
  acceptedAnswers: string[];
};

export function validateQuestion(
  raw: RawQuestion
): { ok: true; data: CleanQuestion } | { ok: false; message: string } {
  const prompt = raw.prompt.trim();
  if (prompt === "") return { ok: false, message: "The question text is required" };
  if (prompt.length > 5000) return { ok: false, message: "The question text is too long (5000 characters maximum)" };

  const points = parsePoints(raw.points);
  if (points === null) {
    return { ok: false, message: "Points must be a number from 0.01 to 100 with at most 2 decimal places" };
  }

  const explanation = raw.explanation.trim();
  if (explanation.length > 3000) return { ok: false, message: "The explanation is too long (3000 characters maximum)" };

  const base = { prompt, points, explanation: explanation === "" ? null : explanation };

  if (raw.type === "TRUE_FALSE") {
    if (raw.trueFalseCorrect !== "true" && raw.trueFalseCorrect !== "false") {
      return { ok: false, message: "Choose whether the statement is true or false" };
    }
    return {
      ok: true,
      data: {
        ...base,
        options: [
          { text: "True", isCorrect: raw.trueFalseCorrect === "true" },
          { text: "False", isCorrect: raw.trueFalseCorrect === "false" },
        ],
        acceptedAnswers: [],
      },
    };
  }

  if (raw.type === "SHORT_ANSWER") {
    const answers = raw.acceptedAnswers
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (answers.length === 0) return { ok: false, message: "Add at least one accepted answer" };
    if (answers.length > 10) return { ok: false, message: "Use at most 10 accepted answers" };
    if (answers.some((a) => a.length > 100)) {
      return { ok: false, message: "Each accepted answer must be 100 characters or fewer" };
    }
    const seen = new Set(answers.map(normalizeAnswer));
    if (seen.size !== answers.length) {
      return { ok: false, message: "Two accepted answers are the same once spacing and capitals are ignored" };
    }
    return { ok: true, data: { ...base, options: [], acceptedAnswers: answers } };
  }

  // SINGLE_CHOICE and MULTIPLE_SELECT
  const correct = new Set(raw.correctIndexes);
  const options: { text: string; isCorrect: boolean }[] = [];

  for (let index = 0; index < raw.optionTexts.length; index += 1) {
    const text = raw.optionTexts[index].trim();
    const flagged = correct.has(String(index));
    if (text === "") {
      if (flagged) return { ok: false, message: "A correct option has no text" };
      continue;
    }
    if (text.length > 300) return { ok: false, message: "Each option must be 300 characters or fewer" };
    options.push({ text, isCorrect: flagged });
  }

  if (options.length < MIN_OPTIONS) return { ok: false, message: `Add at least ${MIN_OPTIONS} answer options` };
  if (options.length > MAX_OPTIONS) return { ok: false, message: `Use at most ${MAX_OPTIONS} answer options` };

  if (new Set(options.map((o) => normalizeAnswer(o.text))).size !== options.length) {
    return { ok: false, message: "Two options have the same text" };
  }

  const correctCount = options.filter((o) => o.isCorrect).length;
  if (raw.type === "SINGLE_CHOICE" && correctCount !== 1) {
    return { ok: false, message: "Choose exactly one correct option" };
  }
  if (raw.type === "MULTIPLE_SELECT" && correctCount < 1) {
    return { ok: false, message: "Choose at least one correct option" };
  }

  return { ok: true, data: { ...base, options, acceptedAnswers: [] } };
}