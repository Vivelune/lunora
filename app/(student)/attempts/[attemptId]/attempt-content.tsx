import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { remainingSeconds } from "@/lib/attempt-rules";
import { finalizeIfExpired } from "@/lib/attempts";
import prisma from "@/lib/prisma";

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

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: owned.id },
    select: {
      attemptNumber: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      submittedAt: true,
      endReason: true,
      exam: { select: { title: true } },
      version: { select: { durationMinutes: true } },
    },
  });

  if (!attempt) {
    notFound();
  }

  const secondsLeft = remainingSeconds(new Date(), attempt.deadlineAt);
  const minutesLeft = Math.ceil(secondsLeft / 60);
  const inProgress = attempt.status === "IN_PROGRESS";
  const timedOut = attempt.endReason === "TIMEOUT";

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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            Attempt {attempt.attemptNumber}
          </span>

          <AttemptStatusPill status={attempt.status} />

          {timedOut && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Time ran out
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3 w-3"
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
            {attempt.version.durationMinutes} min limit
          </span>
        </div>
      </header>

      {/* ============ TIMER (in progress) ============ */}
      {inProgress && (
        <section className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-6 backdrop-blur">
          <span
            aria-hidden
            className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 opacity-20 blur-3xl"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-300">
                Time remaining
              </p>

              <p className="mt-2 text-4xl font-semibold tracking-tight text-white tabular-nums">
                {minutesLeft} <span className="text-xl text-neutral-400">min</span>
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                About {secondsLeft.toLocaleString()} seconds left
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
              </span>
              Timer running
            </span>
          </div>
        </section>
      )}

      {/* ============ OVERVIEW ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Attempt details" />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <InfoRow
            label="Attempt number"
            value={
              <span className="tabular-nums">{attempt.attemptNumber}</span>
            }
          />
          <InfoRow
            label="Status"
            value={<AttemptStatusPill status={attempt.status} />}
          />
          <InfoRow
            label="Started"
            value={
              <span className="tabular-nums">{stamp(attempt.startedAt)}</span>
            }
          />
          <InfoRow
            label="Time limit"
            value={
              <span className="tabular-nums">
                {attempt.version.durationMinutes} min
              </span>
            }
          />
          <InfoRow
            label="Deadline"
            value={
              <span className="tabular-nums">{stamp(attempt.deadlineAt)}</span>
            }
          />
          <InfoRow
            label={inProgress ? "Time left" : "Ended"}
            value={
              inProgress ? (
                <span className="tabular-nums">
                  About {minutesLeft} min
                </span>
              ) : (
                <span className="tabular-nums">
                  {attempt.submittedAt ? stamp(attempt.submittedAt) : "—"}
                </span>
              )
            }
          />
        </dl>
      </section>

      {/* ============ PLACEHOLDER NOTICE ============ */}
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${
          inProgress
            ? "border-indigo-400/20 bg-indigo-500/[0.06]"
            : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <span
          className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ${
            inProgress
              ? "bg-indigo-500/15 text-indigo-300"
              : "bg-white/[0.04] text-neutral-500"
          }`}
        >
          {inProgress ? (
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
          ) : (
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
          )}
        </span>

        <div className="min-w-0">
          <p
            className={`text-sm font-medium ${
              inProgress ? "text-indigo-200" : "text-neutral-300"
            }`}
          >
            {inProgress ? "Exam questions coming soon" : "This attempt has ended"}
          </p>
          <p
            className={`mt-0.5 text-xs leading-relaxed ${
              inProgress ? "text-indigo-300/70" : "text-neutral-500"
            }`}
          >
            {inProgress
              ? "Your timer is running on the server. The exam questions will appear here in the next update."
              : "Results will appear here once grading is available."}
          </p>
        </div>
      </div>

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

function AttemptStatusPill({ status }: { status: string }) {
  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
        </span>
        In progress
      </span>
    );
  }
  if (status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Submitted
      </span>
    );
  }
  if (status === "EXPIRED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Expired
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-400">
      {status}
    </span>
  );
}