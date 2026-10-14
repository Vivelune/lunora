import assert from "node:assert/strict";
import { examWindow } from "../lib/exam-window";

const d = (iso: string) => new Date(iso);
const now = d("2026-10-15T12:00:00Z");

// No dates at all: always available.
assert.equal(examWindow({ now }).state, "AVAILABLE");

// Opens in the future: upcoming.
assert.equal(examWindow({ now, assignmentFrom: d("2026-10-20T00:00:00Z") }).state, "UPCOMING");

// Due date passed: closed.
assert.equal(examWindow({ now, dueDate: d("2026-10-14T23:59:59Z") }).state, "CLOSED");

// Due date later today: still available (the last day counts).
assert.equal(examWindow({ now, dueDate: d("2026-10-15T23:59:59Z") }).state, "AVAILABLE");

// The later open date wins.
assert.equal(
  examWindow({ now, assignmentFrom: d("2026-10-01T00:00:00Z"), examFrom: d("2026-10-18T00:00:00Z") }).state,
  "UPCOMING"
);

// The earlier close date wins (exam window ends before the due date).
assert.equal(
  examWindow({ now, dueDate: d("2026-10-30T00:00:00Z"), examUntil: d("2026-10-10T23:59:59Z") }).state,
  "CLOSED"
);

// Reported dates are the winning ones.
const w = examWindow({
  now,
  assignmentFrom: d("2026-10-01T00:00:00Z"),
  examFrom: d("2026-10-05T00:00:00Z"),
  dueDate: d("2026-10-30T00:00:00Z"),
  examUntil: d("2026-10-25T00:00:00Z"),
});
assert.equal(w.opensAt?.toISOString(), "2026-10-05T00:00:00.000Z");
assert.equal(w.closesAt?.toISOString(), "2026-10-25T00:00:00.000Z");
assert.equal(w.state, "AVAILABLE");

console.log("All exam window checks passed.");