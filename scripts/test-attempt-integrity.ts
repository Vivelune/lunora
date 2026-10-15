import "dotenv/config";
import prisma from "../lib/prisma";
import { saveAnswer } from "../lib/attempt-answers";
import { computeDeadline, inProgressKey } from "../lib/attempt-rules";
import { finalizeIfExpired } from "../lib/attempts";
import { submitAttempt } from "../lib/attempt-submit";
import { recordFocusEvent, type FocusEventType } from "../lib/attempt-focus";
import { gradeAttemptById } from "../lib/attempt-grading";

const MARK = "ZZ-INTEGRITY";
const STUDENT_PREFIX = "zz_integrity_";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  [${detail}]` : ""}`);
  if (!ok) failures += 1;
}
function section(title: string) {
  console.log(`\n== ${title} ==`);
}

function databaseHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    return "unknown";
  }
}

async function cleanup() {
  const exams = await prisma.exam.findMany({ where: { title: { startsWith: MARK } }, select: { id: true } });
  const examIds = exams.map((e) => e.id);

  if (examIds.length > 0) {
    const attempts = await prisma.examAttempt.findMany({ where: { examId: { in: examIds } }, select: { id: true } });
    const attemptIds = attempts.map((a) => a.id);
    await prisma.attemptEvent.deleteMany({ where: { attemptId: { in: attemptIds } } });
    await prisma.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
    await prisma.examAttempt.deleteMany({ where: { id: { in: attemptIds } } });
    await prisma.examAssignment.deleteMany({ where: { examId: { in: examIds } } });

    const versions = await prisma.examVersion.findMany({ where: { examId: { in: examIds } }, select: { id: true } });
    const versionIds = versions.map((v) => v.id);
    await prisma.answerOption.deleteMany({ where: { question: { versionId: { in: versionIds } } } });
    await prisma.question.deleteMany({ where: { versionId: { in: versionIds } } });
    await prisma.examVersion.deleteMany({ where: { examId: { in: examIds } } });
    await prisma.exam.deleteMany({ where: { id: { in: examIds } } });
  }

  await prisma.studentProfile.deleteMany({ where: { clerkUserId: { startsWith: STUDENT_PREFIX } } });
}

async function main() {
  if (!process.argv.includes("--confirm-dev")) {
    console.log(`This test writes (then deletes) test data in the database at: ${databaseHost()}`);
    console.log("Run it again with --confirm-dev, and only if that host is your DEV branch.");
    process.exitCode = 1;
    return;
  }
  console.log(`Running against database host: ${databaseHost()}`);

  await cleanup();

  // ---------- Fixtures ----------
  const admin = await prisma.studentProfile.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const subject = await prisma.subject.findFirst({
    where: { isActive: true, children: { none: {} } },
    select: { id: true },
  });
  if (!admin || !subject) throw new Error("Need at least one admin account and one leaf subject.");

  const makeStudent = (letter: string) =>
    prisma.studentProfile.create({
      data: {
        clerkUserId: `${STUDENT_PREFIX}${letter}`,
        role: "STUDENT",
        firstName: "Test",
        lastName: letter.toUpperCase(),
        onboardingCompletedAt: new Date(),
      },
      select: { id: true },
    });
  const [studentA, studentB, studentC] = await Promise.all([makeStudent("a"), makeStudent("b"), makeStudent("c")]);
  const a = studentA.id;
  const b = studentB.id;
  const c = studentC.id;

  const exam = await prisma.exam.create({
    data: {
      title: `${MARK} exam`,
      subjectId: subject.id,
      createdById: admin.id,
      status: "PUBLISHED",
      versions: {
        create: {
          versionNumber: 1,
          publishedAt: new Date(),
          durationMinutes: 30,
          maxAttempts: 10,
          focusPolicy: "AUTO_SUBMIT",
          maxFocusViolations: 1,
        },
      },
    },
    select: { id: true, versions: { select: { id: true } } },
  });
  const examId = exam.id;
  const versionId = exam.versions[0].id;

  const optionRows = (n: number, correct: number[]) =>
    Array.from({ length: n }, (_, i) => ({ position: i + 1, text: `Option ${i + 1}`, isCorrect: correct.includes(i) }));

  await prisma.question.create({
    data: {
      versionId, position: 1, type: "SINGLE_CHOICE", prompt: "Q1", points: "1",
      options: { create: optionRows(4, [0]) },
    },
  });
  await prisma.question.create({
    data: {
      versionId, position: 2, type: "MULTIPLE_SELECT", prompt: "Q2", points: "2",
      options: { create: optionRows(4, [0, 2]) },
    },
  });
  await prisma.question.create({
    data: { versionId, position: 3, type: "SHORT_ANSWER", prompt: "Q3", points: "1.5", acceptedAnswers: ["7"] },
  });

  const questions = await prisma.question.findMany({
    where: { versionId },
    orderBy: { position: "asc" },
    select: { id: true, options: { orderBy: { position: "asc" }, select: { id: true } } },
  });
  const [q1, q2, q3] = questions;
  const q1o = q1.options.map((o) => o.id);
  const q2o = q2.options.map((o) => o.id);

  // A second exam, to prove questions from another exam are refused.
  const exam2 = await prisma.exam.create({
    data: {
      title: `${MARK} other exam`,
      subjectId: subject.id,
      createdById: admin.id,
      status: "PUBLISHED",
      versions: { create: { versionNumber: 1, publishedAt: new Date() } },
    },
    select: { versions: { select: { id: true } } },
  });
  const foreignQuestion = await prisma.question.create({
    data: {
      versionId: exam2.versions[0].id, position: 1, type: "SINGLE_CHOICE", prompt: "Other", points: "1",
      options: { create: optionRows(2, [0]) },
    },
    select: { id: true },
  });

  const createAttempt = (studentId: string, attemptNumber: number, assignmentId: string | null = null) => {
    const startedAt = new Date();
    return prisma.examAttempt.create({
      data: {
        studentId, examId, versionId, assignmentId, attemptNumber,
        startedAt,
        deadlineAt: computeDeadline(startedAt, 30),
        shuffleSeed: 1234,
        inProgressKey: inProgressKey(studentId, examId),
      },
      select: { id: true },
    });
  };
  const setDeadline = (attemptId: string, offsetMs: number) =>
    prisma.examAttempt.update({ where: { id: attemptId }, data: { deadlineAt: new Date(Date.now() + offsetMs) } });
  const attemptRow = (attemptId: string) =>
    prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: {
        status: true, endReason: true, inProgressKey: true, submittedAt: true, deadlineAt: true, focusViolations: true,
      },
    });
  const eventCount = (attemptId: string, type: "AUTO_SUBMITTED" | "SUBMITTED" | "FOCUS_LOST") =>
    prisma.attemptEvent.count({ where: { attemptId, type } });
  const save = (
    attemptId: string, studentId: string, questionId: string,
    selected: string[], text: string, flagged: boolean, base: number
  ) =>
    saveAnswer({
      attemptId, studentId, questionId,
      selectedOptionIds: selected, textAnswer: text, flagged, baseRevision: base,
    });

  // ---------- 1. Starting ----------
  section("Starting an attempt");
  const starts = await Promise.allSettled([
    prisma.examAttempt.create({
      data: {
        studentId: a, examId, versionId, attemptNumber: 1, deadlineAt: computeDeadline(new Date(), 30),
        shuffleSeed: 1, inProgressKey: inProgressKey(a, examId),
      },
      select: { id: true },
    }),
    prisma.examAttempt.create({
      data: {
        studentId: a, examId, versionId, attemptNumber: 2, deadlineAt: computeDeadline(new Date(), 30),
        shuffleSeed: 2, inProgressKey: inProgressKey(a, examId),
      },
      select: { id: true },
    }),
  ]);
  const winners = starts.filter((r) => r.status === "fulfilled");
  check("two simultaneous starts: the database allows only one in-progress attempt", winners.length === 1, `${winners.length} succeeded`);
  const first = winners[0];
  if (!first || first.status !== "fulfilled") throw new Error("No attempt was created; cannot continue.");
  const A1 = first.value.id;

  // ---------- 2. Saving answers ----------
  section("Saving answers");
  const r1 = await save(A1, a, q1.id, [q1o[0]], "", false, 0);
  check("first save is accepted as revision 1", r1.kind === "saved" && r1.revision === 1);

  const r2 = await save(A1, a, q1.id, [q1o[1]], "", false, 1);
  check("a save based on revision 1 becomes revision 2", r2.kind === "saved" && r2.revision === 2);

  const r3 = await save(A1, a, q1.id, [q1o[2]], "", false, 1);
  check(
    "a stale save (still based on revision 1) is refused as a conflict",
    r3.kind === "conflict" && r3.current.revision === 2 && r3.current.selectedOptionIds[0] === q1o[1]
  );

  const r4 = await save(A1, a, q1.id, [q1o[1]], "", false, 1);
  check("a retry of an identical save is accepted, not treated as a conflict", r4.kind === "saved" && r4.revision === 2);

  const stored = await prisma.attemptAnswer.findUnique({
    where: { attemptId_questionId: { attemptId: A1, questionId: q1.id } },
    select: { selectedOptionIds: true, revision: true },
  });
  check("the stored answer is the newest one, never the stale one", stored?.revision === 2 && stored.selectedOptionIds[0] === q1o[1]);

  const [c1, c2] = await Promise.all([
    save(A1, a, q2.id, [q2o[0]], "", false, 0),
    save(A1, a, q2.id, [q2o[1], q2o[2]], "", false, 0),
  ]);
  const kinds = [c1.kind, c2.kind].sort().join(",");
  check("two simultaneous first saves: one wins, the other is told about the conflict", kinds === "conflict,saved", kinds);
  const q2rows = await prisma.attemptAnswer.count({ where: { attemptId: A1, questionId: q2.id } });
  check("only one answer row exists for that question", q2rows === 1, String(q2rows));

  const bad = [
    ["an option id that does not exist", await save(A1, a, q1.id, ["not-a-real-id"], "", false, 2)],
    ["an option that belongs to a different question", await save(A1, a, q1.id, [q2o[0]], "", false, 2)],
    ["two options on a single-choice question", await save(A1, a, q1.id, [q1o[0], q1o[1]], "", false, 2)],
    ["text on a choice question", await save(A1, a, q1.id, [], "hello", false, 2)],
    ["options on a short-answer question", await save(A1, a, q3.id, [q1o[0]], "", false, 0)],
    ["a text answer over 200 characters", await save(A1, a, q3.id, [], "x".repeat(201), false, 0)],
    ["a question from another exam", await save(A1, a, foreignQuestion.id, [], "", false, 0)],
  ] as const;
  for (const [label, result] of bad) {
    check(`the server refuses ${label}`, result.kind === "invalid", result.kind);
  }
  const afterBad = await prisma.attemptAnswer.findUnique({
    where: { attemptId_questionId: { attemptId: A1, questionId: q1.id } },
    select: { selectedOptionIds: true, revision: true },
  });
  check("refused saves changed nothing", afterBad?.revision === 2 && afterBad.selectedOptionIds[0] === q1o[1]);

  // ---------- 3. Other students ----------
  section("Another student's attempt");
  const foreignSave = await save(A1, c, q1.id, [q1o[0]], "", false, 2);
  check("another student cannot save into this attempt", foreignSave.kind === "not_found", foreignSave.kind);
  const foreignSubmit = await submitAttempt(A1, c);
  check("another student cannot submit this attempt", foreignSubmit.kind === "not_found", foreignSubmit.kind);
  const foreignFocus = await recordFocusEvent({ attemptId: A1, studentId: c, type: "FOCUS_LOST" });
  check("another student cannot report events on this attempt", foreignFocus.kind === "not_found", foreignFocus.kind);

  // ---------- 4. The deadline ----------
  section("The deadline");
  await setDeadline(A1, -5_000);
  const inGrace = await save(A1, a, q3.id, [], "7", false, 0);
  check("a save 5 seconds after the deadline is accepted (inside the 10 second grace)", inGrace.kind === "saved", inGrace.kind);

  await setDeadline(A1, -60_000);
  const finals = await Promise.all([1, 2, 3, 4, 5].map(() => finalizeIfExpired(A1)));
  check("five simultaneous time-outs: exactly one of them ends the attempt", finals.filter(Boolean).length === 1, finals.join(","));
  const expired = await attemptRow(A1);
  check(
    "the attempt ended by TIMEOUT, was graded, and its active-attempt key was released",
    expired?.status === "GRADED" && expired.endReason === "TIMEOUT" && expired.inProgressKey === null
  );
  check("exactly one AUTO_SUBMITTED event was recorded", (await eventCount(A1, "AUTO_SUBMITTED")) === 1);

  const lateSave = await save(A1, a, q3.id, [], "changed", false, 1);
  check("a save after the deadline plus grace is refused as ended", lateSave.kind === "ended", lateSave.kind);
  const keptText = await prisma.attemptAnswer.findUnique({
    where: { attemptId_questionId: { attemptId: A1, questionId: q3.id } },
    select: { textAnswer: true },
  });
  check("the late save did not change the stored answer", keptText?.textAnswer === "7", String(keptText?.textAnswer));

  const lateSubmit = await submitAttempt(A1, a);
  check("submitting an expired attempt does not revive it", lateSubmit.kind === "already_ended" && lateSubmit.status === "GRADED");

  // ---------- Grading ----------
  section("Grading");
  const gradedA1 = await prisma.examAttempt.findUnique({
    where: { id: A1 },
    select: { status: true, pointsEarned: true, pointsPossible: true, percentage: true, passed: true },
  });
  check(
    "the timed-out attempt was graded on its saved answers: 1.5 of 4.5 points",
    gradedA1?.status === "GRADED" && gradedA1.pointsEarned?.toString() === "1.5" && gradedA1.pointsPossible?.toString() === "4.5",
    JSON.stringify(gradedA1)
  );
  check("the percentage is 33.33", gradedA1?.percentage?.toString() === "33.33");
  check("there is no pass or fail without a passing mark", gradedA1?.passed === null);
  check("grading the same attempt again does nothing", (await gradeAttemptById(A1)) === false);
  const gradedRows = await prisma.attemptAnswer.findMany({
    where: { attemptId: A1 },
    select: { questionId: true, isCorrect: true, pointsAwarded: true },
  });
  check("every question has a graded answer row", gradedRows.length === 3 && gradedRows.every((r) => r.isCorrect !== null));
  const q3row = gradedRows.find((r) => r.questionId === q3.id);
  check("the short answer '7' earned its 1.5 points", q3row?.isCorrect === true && q3row.pointsAwarded?.toString() === "1.5");

  // ---------- 5. Submitting ----------
  section("Submitting");
  const A2 = (await createAttempt(a, 3)).id;
  check("after an attempt ends, the student can start the next one", Boolean(A2));

  const submits = await Promise.all([1, 2, 3, 4, 5].map(() => submitAttempt(A2, a)));
  const submitted = submits.filter((s) => s.kind === "submitted").length;
  const already = submits.filter((s) => s.kind === "already_ended").length;
  check("five simultaneous submits: exactly one submits, the rest are told it already ended", submitted === 1 && already === 4, `${submitted}/${already}`);
  check("exactly one SUBMITTED event was recorded", (await eventCount(A2, "SUBMITTED")) === 1);
  const sub = await attemptRow(A2);
  check("status GRADED after a student submit, reason STUDENT, key released", sub?.status === "GRADED" && sub.endReason === "STUDENT" && sub.inProgressKey === null);

  const afterSubmit = await save(A2, a, q1.id, [q1o[0]], "", false, 0);
  check("saving after submit is refused as ended", afterSubmit.kind === "ended", afterSubmit.kind);

  await setDeadline(A2, -60_000);
  const revived = await finalizeIfExpired(A2);
  check("a submitted attempt is never re-finalized as expired", revived === false && (await attemptRow(A2))?.status === "GRADED");

  const A3 = (await createAttempt(a, 4)).id;
  await setDeadline(A3, -4_000);
  const graceSubmit = await submitAttempt(A3, a);
  const graceRow = await attemptRow(A3);
  check(
    "submitting inside the grace counts as submitted, with the end time capped at the deadline",
    graceSubmit.kind === "submitted" && graceRow?.status === "GRADED" && graceRow.submittedAt?.getTime() === graceRow.deadlineAt.getTime()
  );

  // ---------- 6. Focus monitoring ----------
  // Timestamps are passed explicitly so this measures the away-time logic,
  // not the round-trip latency of the database connection.
  section("Focus monitoring");
  const B1 = (await createAttempt(b, 1)).id;
  const focus = (attemptId: string, type: FocusEventType, occurredAt?: Date) =>
    recordFocusEvent({ attemptId, studentId: b, type, occurredAt });

  const t0 = new Date();
  await focus(B1, "FOCUS_LOST", t0);
  const blip = await focus(B1, "FOCUS_RETURNED", new Date(t0.getTime() + 500));
  check("a leave shorter than 2 seconds is not counted", blip.kind === "recorded" && blip.counted === false);

  const stray = await focus(B1, "FOCUS_RETURNED", new Date(t0.getTime() + 700));
  check("a 'returned' with no matching 'left' is not counted", stray.kind === "recorded" && stray.counted === false);

  const t1 = new Date();
  await focus(B1, "FOCUS_LOST", t1);
  const real = await focus(B1, "FOCUS_RETURNED", new Date(t1.getTime() + 2200));
  check(
    "a leave of 2 seconds or more is counted, and the first one only warns",
    real.kind === "recorded" && real.counted && real.violations === 1 && real.action === "WARN",
    JSON.stringify(real)
  );

  const t2 = new Date();
  await focus(B1, "FOCUS_LOST", t2);
  const t2Return = new Date(t2.getTime() + 2200);
  const racing = await Promise.all([
    focus(B1, "FOCUS_RETURNED", t2Return),
    focus(B1, "FOCUS_RETURNED", t2Return),
  ]);
  const counted = racing.filter((r) => r.kind === "recorded" && r.counted);
  check("two simultaneous 'returned' reports count as one violation", counted.length === 1, String(counted.length));
  const ended = await attemptRow(B1);
  check(
    "going past the limit with auto-submit ends the attempt (FOCUS_VIOLATION)",
    ended?.status === "GRADED" && ended.endReason === "FOCUS_VIOLATION" && ended.focusViolations === 2,
    JSON.stringify(ended)
  );
  check("the ending was recorded exactly once", (await eventCount(B1, "AUTO_SUBMITTED")) === 1);

  const afterEnd = await focus(B1, "FOCUS_LOST");
  check("focus events after the end are ignored", afterEnd.kind === "ended", afterEnd.kind);

  const assignment = await prisma.examAssignment.create({
    data: { examId, versionId, studentId: b, createdById: admin.id, focusExempt: true },
    select: { id: true },
  });
  const B2 = (await createAttempt(b, 2, assignment.id)).id;
  const exempt = await focus(B2, "FOCUS_LOST");
  check("an exempt student is not monitored", exempt.kind === "off", exempt.kind);
  check("no events were recorded for the exempt student", (await eventCount(B2, "FOCUS_LOST")) === 0);

  // ---------- 7. Database-wide invariants ----------
  section("Database invariants");
  const doubled = await prisma.$queryRaw<{ studentId: string }[]>`
    SELECT "studentId" FROM "ExamAttempt" WHERE status = 'IN_PROGRESS' GROUP BY "studentId", "examId" HAVING count(*) > 1`;
  check("no student has two in-progress attempts for the same exam", doubled.length === 0, String(doubled.length));

  console.log(failures === 0 ? "\nAll integrity checks passed." : `\n${failures} check(s) FAILED.`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nScript error:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (process.argv.includes("--confirm-dev")) {
        await cleanup();
        console.log("Test data removed.");
      }
    } catch (error) {
      console.error("Cleanup failed. Remove rows named ZZ-INTEGRITY by hand:", error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });