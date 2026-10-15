import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { orderForAttempt } from "@/lib/attempt-order";
import { finalizeIfExpired } from "@/lib/attempts";
import {
  getStudentQuestions,
  countStudentQuestions,
} from "@/lib/exam-student-view";
import prisma from "@/lib/prisma";
import { ExamRunner, type InitialAnswer } from "./exam-runner";
import { tryGradeAttempt } from "@/lib/attempt-grading";
import { getAttemptRelease } from "@/lib/results-release";

const stamp = (d: Date) =>
  d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default async function AttemptContent({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { profile } = await requireCompletedProfile();
  const { attemptId } = await params;

  // Only the student who owns the attempt can open it. Anyone else gets a 404.
  const owned = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId: profile.id },
    select: { id: true },
  });

  if (!owned) {
    notFound();
  }

  await finalizeIfExpired(owned.id);
  // Self-healing: an ended attempt that somehow was not graded yet is graded now.
  await tryGradeAttempt(owned.id);

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: owned.id },
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      submittedAt: true,
      endReason: true,
      shuffleSeed: true,
      focusViolations: true,
      assignment: { select: { focusExempt: true } },
      exam: { select: { title: true } },
      version: {
        select: {
          id: true,
          durationMinutes: true,
          instructions: true,
          shuffleQuestions: true,
          shuffleOptions: true,
          focusPolicy: true,
          maxFocusViolations: true,
          requireFullscreen: true,
        },
      },
      answers: {
        select: {
          questionId: true,
          selectedOptionIds: true,
          textAnswer: true,
          flagged: true,
          revision: true,
        },
      },
    },
  });

  if (!attempt) {
    notFound();
  }

  /* ============ ENDED STATE ============ */
  if (attempt.status !== "IN_PROGRESS") {
    // Counts only. The ended page never shows answers, keys or scores.
    const [totalQuestions, answeredQuestions] = await Promise.all([
      countStudentQuestions(attempt.version.id),
      prisma.attemptAnswer.count({
        where: {
          attemptId: attempt.id,
          OR: [
            { selectedOptionIds: { isEmpty: false } },
            { textAnswer: { not: null } },
          ],
        },
      }),
    ]);

    const timedOut = attempt.endReason === "TIMEOUT";
    const focusEnded = attempt.endReason === "FOCUS_VIOLATION";
    const timeSpentMinutes = attempt.submittedAt
      ? Math.max(
          1,
          Math.round(
            (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) /
              60000
          )
        )
      : null;

    const release = await getAttemptRelease(attempt.id);

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
        {/* ============ HEADER ============ */}
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Exam attempt
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {attempt.exam.title}
          </h1>
        </header>

        {/* ============ STATUS CARD ============ */}
        {timedOut || focusEnded ? (
          <section
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-5 py-4 backdrop-blur"
          >
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6.25"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 5v3.5M8 11h.01"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-amber-200">
                {timedOut ? "Time ran out" : "Your exam was ended"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-200/80">
                {timedOut
                  ? "Your saved answers were submitted automatically."
                  : "Your exam ended because you left the exam page too many times. Your saved answers were submitted."}
              </p>
            </div>
          </section>
        ) : (
          <section
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-5 py-4 backdrop-blur"
          >
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="M3.5 8.5 6.5 11.5 12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-emerald-200">
                Your exam has been submitted
              </p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-200/80">
                Thank you. Your answers were received.
              </p>
            </div>
          </section>
        )}

        {/* ============ ATTEMPT DETAILS ============ */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
          <div className="mb-5">
            <SectionHeader
              dot="from-indigo-400 to-sky-400"
              label="Attempt details"
            />
          </div>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow
              label="Attempt number"
              value={
                <span className="tabular-nums">{attempt.attemptNumber}</span>
              }
            />
            <InfoRow
              label="Questions answered"
              value={
                <span className="tabular-nums">
                  {answeredQuestions} of {totalQuestions}
                </span>
              }
            />
            <InfoRow
              label="Started"
              value={
                <span className="tabular-nums">{stamp(attempt.startedAt)}</span>
              }
            />
            <InfoRow
              label="Ended"
              value={
                <span className="tabular-nums">
                  {attempt.submittedAt ? stamp(attempt.submittedAt) : "—"}
                </span>
              }
            />
            {timeSpentMinutes !== null && (
              <InfoRow
                label="Time used"
                value={
                  <span className="tabular-nums">
                    about {timeSpentMinutes} min
                  </span>
                }
              />
            )}
            <InfoRow label="Status" value={<ReceivedPill />} />
          </dl>
        </section>

        {/* ============ RESULTS ============ */}
        {release?.resultsReleased ? (
          <Link
            href={`/attempts/${attempt.id}/results`}
            className="group inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
          >
            View your results
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            >
              <path
                d="M3 8h10m0 0-4-4m4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-white/[0.04] text-neutral-400">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6.25"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 5v3M8 10.5h.01"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-300">
                {release?.availableAfter
                  ? "Results not yet released"
                  : "Waiting for your tutor"}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {release?.availableAfter
                  ? `Your results will be available after ${stamp(
                      release.availableAfter
                    )}.`
                  : "Your tutor will release your results when they are ready."}
              </p>
            </div>
          </div>
        )}

        {/* ============ BACK LINK ============ */}
        <Link
          href="/exams"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
          >
            <path
              d="M13 8H3m0 0 4-4M3 8l4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to my exams
        </Link>
      </div>
    );
  }

  /* ============ IN PROGRESS STATE ============ */
  // The ONLY way student-facing code reads questions: the student-safe helper.
  const safeQuestions = await getStudentQuestions(attempt.version.id);
  const questions = orderForAttempt(
    safeQuestions,
    attempt.shuffleSeed,
    attempt.version.shuffleQuestions,
    attempt.version.shuffleOptions
  );

  const initialAnswers: Record<string, InitialAnswer> = {};
  for (const a of attempt.answers) {
    initialAnswers[a.questionId] = {
      selectedOptionIds: a.selectedOptionIds,
      textAnswer: a.textAnswer ?? "",
      flagged: a.flagged,
      revision: a.revision,
    };
  }
  const exempt = attempt.assignment?.focusExempt ?? false;
  const monitoring = {
    policy: exempt ? ("OFF" as const) : attempt.version.focusPolicy,
    limit: attempt.version.maxFocusViolations,
    requireFullscreen: attempt.version.requireFullscreen && !exempt,
    initialViolations: attempt.focusViolations,
  };

  return (
    <ExamRunner
      attemptId={attempt.id}
      title={attempt.exam.title}
      instructions={attempt.version.instructions}
      questions={questions}
      initialAnswers={initialAnswers}
      deadlineAt={attempt.deadlineAt.toISOString()}
      serverNow={new Date().toISOString()}
      monitoring={monitoring}
    />
  );
}

/* ============================================================
   Helpers
   ============================================================ */
function SectionHeader({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${dot}`} />
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
        {label}
      </h2>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-3">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </dt>
      <dd className="text-right text-sm text-neutral-200">{value}</dd>
    </div>
  );
}

function ReceivedPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
      Received
    </span>
  );
}