import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { tryGradeAttempt } from "@/lib/attempt-grading";
import { finalizeIfExpired } from "@/lib/attempts";
import { requireCompletedProfile } from "@/lib/auth";
import { getStudentResult } from "@/lib/student-results";
import { ReviewList } from "@/app/components/review-list";

const stamp = (d: Date) =>
  d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default async function ResultsContent({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { profile } = await requireCompletedProfile();
  const { attemptId } = await params;

  await finalizeIfExpired(attemptId);
  await tryGradeAttempt(attemptId);

  const result = await getStudentResult(attemptId, profile.id);

  if (result.kind === "not_found") {
    notFound();
  }
  if (result.kind === "in_progress") {
    redirect(`/attempts/${attemptId}`);
  }

  /* ============ PENDING STATE ============ */
  if (result.kind === "pending") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Results
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Results
          </h1>
        </header>

        <div className="flex items-start gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.06] px-5 py-4 backdrop-blur">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-indigo-500/15 text-indigo-300">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M8 4.5V8l2 1.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-indigo-200">
              {result.availableAfter
                ? "Results are not yet released"
                : "Waiting for your tutor"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-indigo-200/80">
              {result.availableAfter
                ? `Your results will be available after ${stamp(result.availableAfter)}.`
                : "Your tutor will release your results when they are ready."}
            </p>
          </div>
        </div>

        <Link
          href="/results"
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
          All my results
        </Link>
      </div>
    );
  }

  const { summary: s, review } = result;

  /* ============ SCORE TONE ============ */
  const passedTone =
    s.passed === true
      ? "passed"
      : s.passed === false
        ? "failed"
        : "neutral";

  const scoreRing =
    passedTone === "passed"
      ? "border-emerald-400/30 bg-emerald-500/[0.06]"
      : passedTone === "failed"
        ? "border-rose-400/30 bg-rose-500/[0.06]"
        : "border-white/10 bg-white/[0.03]";

  const scoreText =
    passedTone === "passed"
      ? "text-emerald-200"
      : passedTone === "failed"
        ? "text-rose-200"
        : "text-white";

  const accentGlow =
    passedTone === "passed"
      ? "from-emerald-400 to-teal-400"
      : passedTone === "failed"
        ? "from-rose-400 to-fuchsia-400"
        : "from-indigo-400 to-violet-400";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Results
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {s.examTitle}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {s.subject}
          </span>

          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
            Attempt {s.attemptNumber}
          </span>
        </div>
      </header>

      {/* ============ SCORE CARD ============ */}
      <section
        className={`relative overflow-hidden rounded-2xl border p-8 backdrop-blur sm:p-10 ${scoreRing}`}
      >
        {/* Ambient glow */}
        <span
          aria-hidden
          className={`absolute right-0 top-0 h-48 w-48 rounded-full bg-gradient-to-br ${accentGlow} opacity-20 blur-3xl`}
        />

        <div className="flex flex-wrap items-end justify-between gap-6">
          {/* Big score number */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
              Score
            </p>
            <p
              className={`mt-2 text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl ${scoreText}`}
            >
              {s.percentage}
              <span className="text-2xl text-neutral-500">%</span>
            </p>
            <p className="mt-3 text-sm tabular-nums text-neutral-400">
              {s.pointsEarned} of {s.pointsPossible} points
            </p>
          </div>

          {/* Pass/fail pill */}
          {s.passingPercent !== null && (
            <div className="flex flex-col items-end gap-2">
              {s.passed === true && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
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
                  Passed
                </span>
              )}
              {s.passed === false && (
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300">
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="M5 5l6 6M11 5l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  Not passed
                </span>
              )}
              <p className="text-xs text-neutral-500">
                Passing mark {s.passingPercent}%
              </p>
            </div>
          )}
        </div>

        {/* Breakdown */}
        <dl className="mt-8 grid gap-4 border-t border-white/5 pt-6 sm:grid-cols-4">
          <StatCell label="Correct" value={s.correctCount} tone="correct" />
          <StatCell
            label="Incorrect"
            value={s.incorrectCount}
            tone="incorrect"
          />
          <StatCell
            label="Not answered"
            value={s.unansweredCount}
            tone="unanswered"
          />
          {s.minutesUsed !== null ? (
            <StatCell
              label="Time used"
              value={`${s.minutesUsed} min`}
              tone="neutral"
            />
          ) : (
            <div />
          )}
        </dl>

        {/* Submitted */}
        {s.submittedAt && (
          <p className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5"
            >
              <rect
                x="2.5"
                y="3.5"
                width="11"
                height="10"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            Submitted{" "}
            <span className="tabular-nums">{stamp(s.submittedAt)}</span>
          </p>
        )}
      </section>

      {/* ============ STATUS NOTICES ============ */}
      {s.timedOut && (
        <p className="flex items-start gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M8 4.5V8l2 1.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span>
            Time ran out, so your saved answers were graded automatically.
          </span>
        </p>
      )}

      {!s.explanationsReleased && (
        <p className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-neutral-400">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
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
          <span>
            Explanations for the questions will be available later.
          </span>
        </p>
      )}

      {/* ============ REVIEW ============ */}
      <ReviewList review={review} />

      {/* ============ BACK LINK ============ */}
      <Link
        href="/results"
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
        All my results
      </Link>
    </div>
  );
}

/* ============================================================
   StatCell — colored dot + label + value
   ============================================================ */
function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "correct" | "incorrect" | "unanswered" | "neutral";
}) {
  const dot =
    tone === "correct"
      ? "bg-emerald-400"
      : tone === "incorrect"
        ? "bg-rose-400"
        : tone === "unanswered"
          ? "bg-neutral-500"
          : "bg-indigo-400";

  return (
    <div>
      <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </dt>
      <dd className="mt-2 text-xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </dd>
    </div>
  );
}