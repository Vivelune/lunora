import { GRACE_SECONDS } from "./attempt-rules";

export type ReleasePolicyValue = "IMMEDIATE" | "AFTER_DEADLINE" | "MANUAL";

/**
 * "After the deadline" means: nobody can still be taking this exam. The latest possible
 * start (the closing date) plus the full time limit plus the grace. No closing date means
 * there is no deadline, so nothing is released this way (an admin must release it).
 */
export function releaseDeadline(closesAt: Date | null, durationMinutes: number): Date | null {
  if (!closesAt) return null;
  return new Date(closesAt.getTime() + durationMinutes * 60_000 + GRACE_SECONDS * 1000);
}

function policyReleased(
  policy: ReleasePolicyValue,
  now: Date,
  manualStamp: Date | null,
  deadline: Date | null
): boolean {
  if (manualStamp) return true; // an admin's manual release works under any policy
  if (policy === "IMMEDIATE") return true;
  if (policy === "AFTER_DEADLINE") return deadline !== null && now.getTime() > deadline.getTime();
  return false;
}

export type ReleaseInput = {
  gradedAt: Date | null;
  resultsReleasedAt: Date | null;
  explanationsReleasedAt: Date | null;
  resultPolicy: ReleasePolicyValue;
  explanationPolicy: ReleasePolicyValue;
  durationMinutes: number;
  closesAt: Date | null;
};

export type ReleaseState = {
  graded: boolean;
  resultsReleased: boolean;
  explanationsReleased: boolean;
  /** When an "after the deadline" release will happen, if it is waiting only for time to pass. */
  availableAfter: Date | null;
};

export function evaluateRelease(input: ReleaseInput, now: Date): ReleaseState {
  const graded = input.gradedAt !== null;
  const deadline = releaseDeadline(input.closesAt, input.durationMinutes);

  const resultsReleased = graded && policyReleased(input.resultPolicy, now, input.resultsReleasedAt, deadline);
  // Explanations can never come out before the results do.
  const explanationsReleased =
    resultsReleased && policyReleased(input.explanationPolicy, now, input.explanationsReleasedAt, deadline);

  const availableAfter =
    graded && !resultsReleased && input.resultPolicy === "AFTER_DEADLINE" && deadline ? deadline : null;

  return { graded, resultsReleased, explanationsReleased, availableAfter };
}