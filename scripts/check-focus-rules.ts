import assert from "node:assert/strict";
import { actionFor, awayCounts, fullscreenCounts, isMonitoring } from "../lib/focus-rules";

// Monitoring applies unless the policy is off or the student is exempt.
assert.equal(isMonitoring("OFF", false), false);
assert.equal(isMonitoring("LOG_ONLY", false), true);
assert.equal(isMonitoring("WARN_THEN_FLAG", false), true);
assert.equal(isMonitoring("AUTO_SUBMIT", true), false);

// Blips under 2 seconds are ignored.
assert.equal(awayCounts(0), false);
assert.equal(awayCounts(1999), false);
assert.equal(awayCounts(2000), true);
assert.equal(awayCounts(60_000), true);

// Fullscreen exits are de-duplicated against a recent violation.
const now = new Date("2026-10-15T12:00:10Z");
assert.equal(fullscreenCounts(now, null), true);
assert.equal(fullscreenCounts(now, new Date("2026-10-15T12:00:08Z")), false);
assert.equal(fullscreenCounts(now, new Date("2026-10-15T12:00:07Z")), true);

// Log only and off never act.
for (let v = 1; v <= 6; v += 1) {
  assert.equal(actionFor("LOG_ONLY", v, 3), "NONE");
  assert.equal(actionFor("OFF", v, 3), "NONE");
}

// Warn then flag, limit 3: warnings for 1 to 3, flag from the 4th.
assert.deepEqual([1, 2, 3, 4, 5].map((v) => actionFor("WARN_THEN_FLAG", v, 3)), ["WARN", "WARN", "WARN", "FLAG", "FLAG"]);

// Auto-submit, limit 3: warnings for 1 to 3, the 4th ends the attempt.
assert.deepEqual([1, 2, 3, 4].map((v) => actionFor("AUTO_SUBMIT", v, 3)), ["WARN", "WARN", "WARN", "END"]);

// Limit 1: one warning, then the next ends it.
assert.deepEqual([1, 2].map((v) => actionFor("AUTO_SUBMIT", v, 1)), ["WARN", "END"]);

console.log("All focus rule checks passed.");