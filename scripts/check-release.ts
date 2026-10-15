import assert from "node:assert/strict";
import { evaluateRelease, releaseDeadline, type ReleaseInput } from "../lib/release";

const t = (iso: string) => new Date(iso);
const now = t("2026-10-15T12:00:00Z");

const base: ReleaseInput = {
  gradedAt: t("2026-10-15T11:00:00Z"),
  resultsReleasedAt: null,
  explanationsReleasedAt: null,
  resultPolicy: "IMMEDIATE",
  explanationPolicy: "IMMEDIATE",
  durationMinutes: 30,
  closesAt: null,
};

// Not graded: nothing is released, whatever the policy.
assert.equal(evaluateRelease({ ...base, gradedAt: null }, now).resultsReleased, false);
assert.equal(evaluateRelease({ ...base, gradedAt: null, resultsReleasedAt: now }, now).resultsReleased, false);

// Immediate.
const immediate = evaluateRelease(base, now);
assert.equal(immediate.resultsReleased, true);
assert.equal(immediate.explanationsReleased, true);

// Manual: hidden until stamped; the stamp works.
const manual: ReleaseInput = { ...base, resultPolicy: "MANUAL", explanationPolicy: "MANUAL" };
assert.equal(evaluateRelease(manual, now).resultsReleased, false);
assert.equal(evaluateRelease({ ...manual, resultsReleasedAt: now }, now).resultsReleased, true);
assert.equal(evaluateRelease({ ...manual, resultsReleasedAt: now }, now).explanationsReleased, false);
assert.equal(
  evaluateRelease({ ...manual, resultsReleasedAt: now, explanationsReleasedAt: now }, now).explanationsReleased,
  true
);

// Explanations never come before results, even if they were stamped or are "immediate".
const early = evaluateRelease({ ...manual, explanationPolicy: "IMMEDIATE", explanationsReleasedAt: now }, now);
assert.equal(early.resultsReleased, false);
assert.equal(early.explanationsReleased, false);

// Releasing the results under an "immediate" policy for results but manual for explanations.
const split = evaluateRelease({ ...base, explanationPolicy: "MANUAL" }, now);
assert.equal(split.resultsReleased, true);
assert.equal(split.explanationsReleased, false);

// After the deadline = closing date + time limit + 10s grace.
assert.equal(
  releaseDeadline(t("2026-10-15T10:00:00Z"), 30)?.toISOString(),
  "2026-10-15T10:30:10.000Z"
);
assert.equal(releaseDeadline(null, 30), null);

const after: ReleaseInput = { ...base, resultPolicy: "AFTER_DEADLINE", explanationPolicy: "AFTER_DEADLINE" };

// A deadline that is still in the future: hidden, and the release time is reported.
const waiting = evaluateRelease({ ...after, closesAt: t("2026-10-15T11:45:00Z") }, now);
assert.equal(waiting.resultsReleased, false);
assert.equal(waiting.availableAfter?.toISOString(), "2026-10-15T12:15:10.000Z");

// Closing date passed, but a student could still be inside their time limit: still hidden.
assert.equal(evaluateRelease({ ...after, closesAt: t("2026-10-15T11:45:00Z") }, t("2026-10-15T12:14:00Z")).resultsReleased, false);
assert.equal(evaluateRelease({ ...after, closesAt: t("2026-10-15T11:45:00Z") }, t("2026-10-15T12:16:00Z")).resultsReleased, true);

// No deadline at all: "after the deadline" behaves as manual.
const noDeadline = evaluateRelease(after, now);
assert.equal(noDeadline.resultsReleased, false);
assert.equal(noDeadline.availableAfter, null);
assert.equal(evaluateRelease({ ...after, resultsReleasedAt: now }, now).resultsReleased, true);

// A manual release overrides a deadline that has not passed.
assert.equal(
  evaluateRelease({ ...after, closesAt: t("2026-10-20T00:00:00Z"), resultsReleasedAt: now }, now).resultsReleased,
  true
);

console.log("All release checks passed.");