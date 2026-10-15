import type { QuestionTypeValue } from "./question-input";

export type AnswerPayload = {
  selectedOptionIds: string[];
  textAnswer: string;
  flagged: boolean;
};

export const MAX_TEXT_ANSWER = 200;

export function validateAnswer(
  input: { selectedOptionIds: unknown; textAnswer: unknown; flagged: unknown },
  question: { type: QuestionTypeValue; optionIds: string[] }
): { ok: true; data: AnswerPayload } | { ok: false; message: string } {
  if (typeof input.flagged !== "boolean") {
    return { ok: false, message: "Invalid answer" };
  }

  const selected = input.selectedOptionIds === undefined ? [] : input.selectedOptionIds;
  if (!Array.isArray(selected) || selected.some((id) => typeof id !== "string")) {
    return { ok: false, message: "Invalid answer" };
  }
  const selectedIds = selected as string[];

  const text = input.textAnswer === undefined ? "" : input.textAnswer;
  if (typeof text !== "string") {
    return { ok: false, message: "Invalid answer" };
  }

  if (question.type === "SHORT_ANSWER") {
    if (selectedIds.length > 0) return { ok: false, message: "Invalid answer" };
    if (text.length > MAX_TEXT_ANSWER) {
      return { ok: false, message: `Answers can be at most ${MAX_TEXT_ANSWER} characters` };
    }
    return { ok: true, data: { selectedOptionIds: [], textAnswer: text, flagged: input.flagged } };
  }

  if (text !== "") return { ok: false, message: "Invalid answer" };

  if (new Set(selectedIds).size !== selectedIds.length) {
    return { ok: false, message: "Invalid answer" };
  }
  const allowed = new Set(question.optionIds);
  if (selectedIds.some((id) => !allowed.has(id))) {
    return { ok: false, message: "Invalid answer" };
  }
  if (question.type !== "MULTIPLE_SELECT" && selectedIds.length > 1) {
    return { ok: false, message: "Only one option can be chosen" };
  }

  return { ok: true, data: { selectedOptionIds: selectedIds, textAnswer: "", flagged: input.flagged } };
}

/** True when two answers say exactly the same thing (option order does not matter). */
export function sameAnswerContent(a: AnswerPayload, b: AnswerPayload): boolean {
  if (a.flagged !== b.flagged || a.textAnswer !== b.textAnswer) return false;
  if (a.selectedOptionIds.length !== b.selectedOptionIds.length) return false;
  const setB = new Set(b.selectedOptionIds);
  return a.selectedOptionIds.every((id) => setB.has(id));
}