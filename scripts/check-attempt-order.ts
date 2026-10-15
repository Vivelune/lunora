import assert from "node:assert/strict";
import { orderForAttempt, seededShuffle } from "../lib/attempt-order";
import type { StudentQuestion } from "../lib/exam-student-safe";

function question(position: number, type: StudentQuestion["type"] = "SINGLE_CHOICE"): StudentQuestion {
  return {
    id: `q${position}`,
    position,
    type,
    prompt: `Question ${position}`,
    points: "1",
    imageId: null,
    imageAlt: null,
    options:
      type === "SHORT_ANSWER"
        ? []
        : type === "TRUE_FALSE"
          ? [
              { id: `o${position}a`, position: 1, text: "True" },
              { id: `o${position}b`, position: 2, text: "False" },
            ]
          : [1, 2, 3, 4, 5].map((n) => ({ id: `o${position}-${n}`, position: n, text: `Option ${n}` })),
  };
}

const questions = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => question(n));
const ids = (list: StudentQuestion[]) => list.map((q) => q.id);

// Deterministic: the same seed always gives the same order.
assert.deepEqual(
  ids(orderForAttempt(questions, 12345, true, true)),
  ids(orderForAttempt(questions, 12345, true, true))
);

// Different seeds give different orders (at least one of several differs).
const orders = [1, 2, 3, 4, 5].map((s) => ids(orderForAttempt(questions, s * 7919, true, false)).join(","));
assert.ok(new Set(orders).size > 1, "different seeds should give different orders");

// A shuffle is a permutation: same questions, nothing lost or duplicated.
const shuffled = orderForAttempt(questions, 99, true, true);
assert.deepEqual([...ids(shuffled)].sort(), ids(questions).sort());
for (const q of shuffled) {
  const original = questions.find((o) => o.id === q.id)!;
  assert.deepEqual(q.options.map((o) => o.id).sort(), original.options.map((o) => o.id).sort());
}

// No shuffling keeps the authored order.
assert.deepEqual(ids(orderForAttempt([...questions].reverse(), 5, false, false)), ids(questions));

// True/false options are never shuffled, even with option shuffling on.
const tf = orderForAttempt([question(1, "TRUE_FALSE")], 777, false, true);
assert.deepEqual(tf[0].options.map((o) => o.text), ["True", "False"]);

// The input is never changed.
const before = JSON.stringify(questions);
orderForAttempt(questions, 31337, true, true);
assert.equal(JSON.stringify(questions), before);

// The generic shuffle is a permutation too.
assert.deepEqual([...seededShuffle([1, 2, 3, 4, 5], 42)].sort(), [1, 2, 3, 4, 5]);

console.log("All attempt order checks passed.");