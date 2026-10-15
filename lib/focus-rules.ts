export type FocusPolicyValue = "OFF" | "LOG_ONLY" | "WARN_THEN_FLAG" | "AUTO_SUBMIT";
export type FocusAction = "NONE" | "WARN" | "FLAG" | "END";

/** Leaving the page for less than this is ignored (notifications, accidental clicks). */
export const MIN_AWAY_MS = 2000;
/** A fullscreen exit this soon after another violation is the same incident. */
export const FULLSCREEN_DEDUPE_MS = 3000;

export function isMonitoring(policy: FocusPolicyValue, exempt: boolean): boolean {
  return policy !== "OFF" && !exempt;
}

export function awayCounts(awayMs: number): boolean {
  return awayMs >= MIN_AWAY_MS;
}

export function fullscreenCounts(now: Date, lastViolationAt: Date | null): boolean {
  return !lastViolationAt || now.getTime() - lastViolationAt.getTime() >= FULLSCREEN_DEDUPE_MS;
}

/**
 * What happens at violation number `violations` when students may leave `limit` times.
 * Up to the limit: warn. One past it: flag for review, or end the attempt.
 */
export function actionFor(policy: FocusPolicyValue, violations: number, limit: number): FocusAction {
  if (policy === "OFF" || policy === "LOG_ONLY") return "NONE";
  if (violations <= limit) return "WARN";
  return policy === "AUTO_SUBMIT" ? "END" : "FLAG";
}