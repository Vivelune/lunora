import type { StudentExamCard } from "@/lib/student-exams";
import { startOrResumeAttempt } from "./start-actions";

const day = (d: Date) => `${d.toISOString().slice(0, 10)} UTC`;

export function ExamCard({ exam }: { exam: StudentExamCard }) {
  const stateLabel =
    exam.state === "AVAILABLE"
      ? "Available"
      : exam.state === "UPCOMING"
        ? "Coming up"
        : exam.state === "CLOSED"
          ? "Closed"
          : "Not available";

  const resuming = exam.inProgressAttemptId !== null;
  const canStart =
    exam.state === "AVAILABLE" && exam.attemptsUsed < exam.attemptsAllowed;
  const attemptsExhausted =
    exam.state === "AVAILABLE" && !resuming && !canStart;

  const isAvailable = exam.state === "AVAILABLE";
  const isUpcoming = exam.state === "UPCOMING";
  const isClosed = exam.state === "CLOSED" || exam.state === "UNAVAILABLE";

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border p-5 backdrop-blur transition-colors ${
        resuming
          ? "border-amber-400/30 bg-amber-500/[0.04] hover:border-amber-400/40"
          : isAvailable
            ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
            : isUpcoming
              ? "border-sky-400/15 bg-sky-500/[0.03]"
              : "border-white/5 bg-white/[0.02] opacity-80"
      }`}
    >
      {/* ============ HEADER ============ */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-white">
            {exam.title}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">{exam.subject}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {resuming ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              In progress
            </span>
          ) : (
            <StatePill state={exam.state} label={stateLabel} />
          )}
          <KindPill kind={exam.kind} />
        </div>
      </div>

      {/* ============ DESCRIPTION ============ */}
      {exam.description && (
        <p className="text-sm leading-relaxed text-neutral-400">
          {exam.description}
        </p>
      )}

      {/* ============ STATS ============ */}
      <dl className="grid gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs sm:grid-cols-2">
        <StatCell label="Time limit" value={`${exam.durationMinutes} min`} />
        <StatCell
          label="Attempts"
          value={`${exam.attemptsUsed} of ${exam.attemptsAllowed} used`}
        />
        <StatCell
          label="Questions"
          value={`${exam.questionCount} (${exam.totalPoints} pts)`}
        />
        {exam.passingPercent !== null && (
          <StatCell label="Passing mark" value={`${exam.passingPercent}%`} />
        )}
      </dl>

      {/* ============ TIMING ============ */}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-400">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-500"
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
          {isUpcoming && exam.opensAt && `Opens ${day(exam.opensAt)}.`}
          {isAvailable && exam.closesAt && `Start by ${day(exam.closesAt)}.`}
          {isAvailable && !exam.closesAt && "No deadline."}
          {isClosed &&
            exam.closesAt &&
            `The deadline to start passed on ${day(exam.closesAt)}.`}
          {exam.state === "UNAVAILABLE" &&
            "This exam is not available right now. Please contact your tutor."}
        </span>
      </p>

      {/* ============ INSTRUCTIONS ============ */}
      {exam.instructions && (
        <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.04] px-4 py-3">
          <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3 w-3"
            >
              <path
                d="M4 3.5h8v9l-4-2.5-4 2.5v-9Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            From your tutor
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-amber-100/90">
            {exam.instructions}
          </p>
        </div>
      )}

      {/* ============ ACTIONS ============ */}
      {(resuming || canStart) && (
        <form action={startOrResumeAttempt} className="mt-auto flex flex-col gap-3 pt-1">
          {exam.assignmentId ? (
            <input type="hidden" name="assignmentId" value={exam.assignmentId} />
          ) : (
            <input type="hidden" name="examId" value={exam.examId} />
          )}

          {/* Warning when starting fresh */}
          {!resuming && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/15 bg-amber-500/[0.04] px-3.5 py-2.5">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-300"
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
              <p className="text-xs leading-relaxed text-amber-200/90">
                The timer starts as soon as you press Start and{" "}
                <strong className="font-medium text-amber-100">
                  cannot be paused
                </strong>
                .
              </p>
            </div>
          )}

          <button
            type="submit"
            className={`group inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-90 sm:w-fit ${
              resuming
                ? "border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/[0.18]"
                : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"
            }`}
          >
            {resuming ? (
              <>
                Resume exam
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
              </>
            ) : (
              <>
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5"
                >
                  <path
                    d="M5 3.5 11 8l-6 4.5v-9Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
                Start exam
              </>
            )}
          </button>
        </form>
      )}

      {/* ============ ATTEMPTS EXHAUSTED ============ */}
      {attemptsExhausted && (
        <div className="mt-auto flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-500"
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
          <p className="text-xs leading-relaxed text-neutral-400">
            You have used all {exam.attemptsAllowed} attempts for this exam.
          </p>
        </div>
      )}
    </article>
  );
}

/* ============================================================
   Helpers
   ============================================================ */
function StatePill({ state, label }: { state: string; label: string }) {
  if (state === "AVAILABLE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {label}
      </span>
    );
  }
  if (state === "UPCOMING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
        {label}
      </span>
    );
  }
  if (state === "CLOSED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
      {label}
    </span>
  );
}

function KindPill({ kind }: { kind: string }) {
  if (kind === "ASSIGNED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">
        Assigned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
      Practice
    </span>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="tabular-nums text-neutral-300">{value}</dd>
    </div>
  );
}