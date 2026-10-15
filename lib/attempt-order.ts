import { assertNoAnswerKey, type StudentQuestion } from "./exam-student-safe";

/** Small seeded random generator: the same seed always gives the same sequence. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a: turns text (a question id) into a number. */
function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Fisher-Yates shuffle with a seed. Returns a new array and never changes the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** The order one attempt sees. Same seed, same order, on every refresh. */
export function orderForAttempt(
  questions: StudentQuestion[],
  seed: number,
  shuffleQuestions: boolean,
  shuffleOptions: boolean
): StudentQuestion[] {
  const base = [...questions].sort((a, b) => a.position - b.position);
  const ordered = shuffleQuestions ? seededShuffle(base, seed) : base;

  const result = ordered.map((question) => {
    const canShuffle = question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_SELECT";
    if (!shuffleOptions || !canShuffle) return question;
    return {
      ...question,
      options: seededShuffle(question.options, (seed ^ hashText(question.id)) >>> 0),
    };
  });

  assertNoAnswerKey(result);
  return result;
}