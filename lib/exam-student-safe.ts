import type { QuestionTypeValue } from "./question-input";

/**
 * The ONLY fields a student may receive about a question.
 * Deliberately absent: isCorrect, acceptedAnswers, explanation.
 */
export const STUDENT_QUESTION_SELECT = {
  id: true,
  position: true,
  type: true,
  prompt: true,
  points: true,
  imageId: true,
  imageAlt: true,
  options: {
    orderBy: { position: "asc" },
    select: { id: true, position: true, text: true },
  },
} as const;

export type StudentQuestion = {
  id: string;
  position: number;
  type: QuestionTypeValue;
  prompt: string;
  points: string;
  imageId: string | null;
  imageAlt: string | null;
  options: { id: string; position: number; text: string }[];
};

type RawStudentQuestion = {
  id: string;
  position: number;
  type: QuestionTypeValue;
  prompt: string;
  points: { toString(): string };
  imageId: string | null;
  imageAlt: string | null;
  options: { id: string; position: number; text: string }[];
};

/** Copies fields explicitly, so an extra field can never slip through by accident. */
export function toStudentQuestion(raw: RawStudentQuestion): StudentQuestion {
  const question: StudentQuestion = {
    id: raw.id,
    position: raw.position,
    type: raw.type,
    prompt: raw.prompt,
    points: raw.points.toString(),
    imageId: raw.imageId,
    imageAlt: raw.imageAlt,
    options: raw.options.map((o) => ({ id: o.id, position: o.position, text: o.text })),
  };
  assertNoAnswerKey(question);
  return question;
}

const FORBIDDEN_KEYS = new Set(["isCorrect", "acceptedAnswers", "explanation"]);

/** Throws if any answer-key field appears anywhere inside the value. */
export function assertNoAnswerKey(value: unknown, path = "value"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoAnswerKey(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error(`Answer key field "${key}" found at ${path}.${key}`);
      }
      assertNoAnswerKey(child, `${path}.${key}`);
    }
  }
}