export const RELEASE_POLICIES = ["IMMEDIATE", "AFTER_DEADLINE", "MANUAL"] as const;
export const FOCUS_POLICIES = ["OFF", "LOG_ONLY", "WARN_THEN_FLAG", "AUTO_SUBMIT"] as const;

export type ReleaseValue = (typeof RELEASE_POLICIES)[number];
export type FocusValue = (typeof FOCUS_POLICIES)[number];

export const RELEASE_LABELS: Record<ReleaseValue, string> = {
  IMMEDIATE: "Immediately after submission",
  AFTER_DEADLINE: "After the deadline passes",
  MANUAL: "When an admin releases them",
};

export const FOCUS_LABELS: Record<FocusValue, string> = {
  OFF: "Off",
  LOG_ONLY: "Log only (admins can review; the student sees nothing)",
  WARN_THEN_FLAG: "Warn the student, then flag for admin review after the limit",
  AUTO_SUBMIT: "Warn the student, then auto-submit after the limit",
};

const RELEASE_RANK: Record<ReleaseValue, number> = { IMMEDIATE: 0, AFTER_DEADLINE: 1, MANUAL: 2 };

export type RawSettings = {
  instructions: string;
  durationMinutes: string;
  maxAttempts: string;
  passingPercent: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  resultRelease: string;
  explanationRelease: string;
  focusPolicy: string;
  maxFocusViolations: string;
  requireFullscreen: boolean;
};

export type CleanSettings = {
  instructions: string | null;
  durationMinutes: number;
  maxAttempts: number;
  passingPercent: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  resultRelease: ReleaseValue;
  explanationRelease: ReleaseValue;
  focusPolicy: FocusValue;
  maxFocusViolations: number;
  requireFullscreen: boolean;
};

function wholeNumber(value: string, min: number, max: number): number | null {
  const text = value.trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return number >= min && number <= max ? number : null;
}

export function validateSettings(
  raw: RawSettings
): { ok: true; data: CleanSettings } | { ok: false; message: string } {
  const duration = wholeNumber(raw.durationMinutes, 1, 600);
  if (duration === null) return { ok: false, message: "Duration must be a whole number between 1 and 600 minutes" };

  const attempts = wholeNumber(raw.maxAttempts, 1, 20);
  if (attempts === null) return { ok: false, message: "Attempts must be a whole number between 1 and 20" };

  let passing: number | null = null;
  if (raw.passingPercent.trim() !== "") {
    passing = wholeNumber(raw.passingPercent, 1, 100);
    if (passing === null) return { ok: false, message: "The passing mark must be a whole number from 1 to 100" };
  }

  if (!(RELEASE_POLICIES as readonly string[]).includes(raw.resultRelease)) {
    return { ok: false, message: "Choose when results are released" };
  }
  if (!(RELEASE_POLICIES as readonly string[]).includes(raw.explanationRelease)) {
    return { ok: false, message: "Choose when explanations are released" };
  }
  const resultRelease = raw.resultRelease as ReleaseValue;
  const explanationRelease = raw.explanationRelease as ReleaseValue;
  if (RELEASE_RANK[explanationRelease] < RELEASE_RANK[resultRelease]) {
    return { ok: false, message: "Explanations cannot be released earlier than results" };
  }

  if (!(FOCUS_POLICIES as readonly string[]).includes(raw.focusPolicy)) {
    return { ok: false, message: "Choose a focus monitoring option" };
  }

  const violations = wholeNumber(raw.maxFocusViolations, 1, 10);
  if (violations === null) return { ok: false, message: "The violation limit must be a whole number from 1 to 10" };

  const instructions = raw.instructions.trim();
  if (instructions.length > 5000) return { ok: false, message: "Instructions are too long (5000 characters maximum)" };

  return {
    ok: true,
    data: {
      instructions: instructions === "" ? null : instructions,
      durationMinutes: duration,
      maxAttempts: attempts,
      passingPercent: passing,
      shuffleQuestions: raw.shuffleQuestions,
      shuffleOptions: raw.shuffleOptions,
      resultRelease,
      explanationRelease,
      focusPolicy: raw.focusPolicy as FocusValue,
      maxFocusViolations: violations,
      requireFullscreen: raw.requireFullscreen,
    },
  };
}