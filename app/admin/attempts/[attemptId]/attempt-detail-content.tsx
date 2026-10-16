import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { finalizeIfExpired } from "@/lib/attempts";
import prisma from "@/lib/prisma";
import { clearAttemptFlag } from "../actions";
import { releaseFromRow } from "@/lib/results-release";
import { setAttemptRelease } from "../release-actions";

const stamp = (d: Date | null) =>
  d ? d.toISOString().slice(0, 19).replace("T", " ") + " UTC" : "—";

const LABELS: Record<string, string> = {
  STARTED: "Exam started",
  RESUMED: "Student came back after being away",
  FOCUS_LOST: "Left the exam page",
  FOCUS_RETURNED: "Returned to the exam page",
  FULLSCREEN_EXITED: "Exited fullscreen",
  WARNING_SHOWN: "Warning issued",
  SUBMITTED: "Student submitted",
  AUTO_SUBMITTED: "Ended automatically",
};

function describe(type: string, details: unknown): string {
  const d = (details ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof d.awayMs === "number") {
    parts.push(`away ${(d.awayMs / 1000).toFixed(1)}s`);
    parts.push(d.counted ? "counted" : "not counted (too short)");
  } else if (type === "FULLSCREEN_EXITED") {
    parts.push(d.counted ? "counted" : "not counted (same incident)");
  }
  if (typeof d.awaySeconds === "number") parts.push(`away about ${d.awaySeconds}s`);
  if (typeof d.count === "number" && typeof d.limit === "number")
    parts.push(`violation ${d.count} (limit ${d.limit})`);
  if (d.flagged === true) parts.push("flagged for review");
  if (typeof d.reason === "string")
    parts.push(`reason: ${d.reason.toLowerCase().replace("_", " ")}`);
  return parts.join(", ");
}

const EVENT_STYLES: Record<
  string,
  { dot: string; label: string }
> = {
  STARTED: { dot: "from-emerald-400 to-teal-400", label: "Exam started" },
  RESUMED: { dot: "from-emerald-400 to-teal-400", label: "Resumed" },
  FOCUS_LOST: { dot: "from-amber-400 to-orange-400", label: "Focus lost" },
  FOCUS_RETURNED: { dot: "from-emerald-400 to-teal-400", label: "Returned" },
  FULLSCREEN_EXITED: { dot: "from-amber-400 to-orange-400", label: "Fullscreen exited" },
  WARNING_SHOWN: { dot: "from-amber-400 to-orange-400", label: "Warning issued" },
  SUBMITTED: { dot: "from-indigo-400 to-violet-400", label: "Submitted" },
  AUTO_SUBMITTED: { dot: "from-rose-400 to-fuchsia-400", label: "Auto-submitted" },
};

export default async function AttemptDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const { attemptId } = await params;
  const { saved, error } = await searchParams;

  await finalizeIfExpired(attemptId);

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      submittedAt: true,
      lastActivityAt: true,
      endReason: true,
      focusViolations: true,
      flaggedForReview: true,
      pointsEarned: true,
      pointsPossible: true,
      percentage: true,
      passed: true,
      gradedAt: true,
      resultsReleasedAt: true,
      explanationsReleasedAt: true,
      student: {
        select: { firstName: true, lastName: true, gradeLevel: true },
      },
      exam: { select: { title: true, availableUntil: true } },
      version: {
        select: {
          id: true,
          versionNumber: true,
          durationMinutes: true,
          focusPolicy: true,
          maxFocusViolations: true,
          resultRelease: true,
          explanationRelease: true,
        },
      },
      assignment: { select: { focusExempt: true, dueDate: true } },
      events: {
        orderBy: { occurredAt: "asc" },
        select: {
          id: true,
          type: true,
          occurredAt: true,
          details: true,
        },
      },
    },
  });

  if (!attempt) {
    notFound();
  }

  const [totalQuestions, answeredQuestions] = await Promise.all([
    prisma.question.count({ where: { versionId: attempt.version.id } }),
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

  const exempt = attempt.assignment?.focusExempt ?? false;

  const release = releaseFromRow({
    gradedAt: attempt.gradedAt,
    resultsReleasedAt: attempt.resultsReleasedAt,
    explanationsReleasedAt: attempt.explanationsReleasedAt,
    version: {
      resultRelease: attempt.version.resultRelease,
      explanationRelease: attempt.version.explanationRelease,
      durationMinutes: attempt.version.durationMinutes,
    },
    assignment: attempt.assignment
      ? { dueDate: attempt.assignment.dueDate }
      : null,
    exam: { availableUntil: attempt.exam.availableUntil },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Attempt review
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {attempt.student.lastName}, {attempt.student.firstName}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {attempt.exam.title}
          </span>

          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
            v{attempt.version.versionNumber}
          </span>

          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
            #{attempt.attemptNumber}
          </span>

          <AttemptStatusPill
            status={attempt.status}
            endReason={attempt.endReason}
          />

          {attempt.flaggedForReview && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Flagged for review
            </span>
          )}
        </div>
      </header>

      {/* ============ STATUS MESSAGES ============ */}
      {saved && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <path
              d="M3.5 8.5 6.5 11.5 12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{saved}</span>
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
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
          <span>{error}</span>
        </p>
      )}

      {/* ============ FLAG BANNER ============ */}
      {attempt.flaggedForReview && (
        <section className="relative overflow-hidden rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-5 backdrop-blur">
          <span
            aria-hidden
            className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-rose-400 to-fuchsia-400 opacity-15 blur-3xl"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-300">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M4 3.5h8v9l-4-2.5-4 2.5v-9Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <div>
                <p className="text-sm font-medium text-rose-200">
                  Flagged for review
                </p>
                <p className="mt-0.5 text-xs text-rose-300/70">
                  This attempt was flagged automatically by focus monitoring.
                </p>
              </div>
            </div>

            <form action={clearAttemptFlag}>
              <input type="hidden" name="attemptId" value={attempt.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                Mark as reviewed
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5"
                >
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* ============ OVERVIEW ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Overview" />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <InfoRow
            label="Status"
            value={
              <span className="font-medium text-neutral-200">
                {attempt.status.replace("_", " ").toLowerCase()}
                {attempt.endReason && (
                  <span className="text-neutral-500">
                    {" "}
                    ({attempt.endReason.toLowerCase().replace("_", " ")})
                  </span>
                )}
              </span>
            }
          />
          <InfoRow
            label="Answered"
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
            label="Deadline"
            value={
              <span className="tabular-nums">{stamp(attempt.deadlineAt)}</span>
            }
          />
          <InfoRow
            label="Ended"
            value={
              <span className="tabular-nums">{stamp(attempt.submittedAt)}</span>
            }
          />
          <InfoRow
            label="Last activity"
            value={
              <span className="tabular-nums">
                {stamp(attempt.lastActivityAt)}
              </span>
            }
          />
          <InfoRow
            label="Focus monitoring"
            value={
              exempt ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Exempt (accommodation)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-neutral-300">
                    {attempt.version.focusPolicy
                      .toLowerCase()
                      .replaceAll("_", " ")}
                  </span>
                  {attempt.version.focusPolicy !== "OFF" && (
                    <span className="text-[11px] text-neutral-500">
                      limit {attempt.version.maxFocusViolations}
                    </span>
                  )}
                </span>
              )
            }
          />
          <InfoRow
            label="Times left the page"
            value={
              attempt.focusViolations > 0 ? (
                <span className="inline-flex items-center gap-1.5 tabular-nums text-amber-300/90">
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-3 w-3"
                  >
                    <path
                      d="M2.5 8s2-4 5.5-4 5.5 4 5.5 4-2 4-5.5 4-5.5-4-5.5-4Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <circle
                      cx="8"
                      cy="8"
                      r="1.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                  {attempt.focusViolations}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 tabular-nums text-neutral-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />0
                </span>
              )
            }
          />
          <InfoRow
            label="Score"
            value={
              attempt.pointsEarned !== null &&
              attempt.pointsPossible !== null ? (
                <span className="inline-flex items-center gap-2">
                  <span className="tabular-nums">
                    {attempt.pointsEarned.toString()}
                    <span className="text-neutral-500">
                      {" "}
                      of {attempt.pointsPossible.toString()}
                    </span>
                  </span>
                  {attempt.percentage !== null && (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] tabular-nums text-neutral-400">
                      {attempt.percentage.toString()}%
                    </span>
                  )}
                  {attempt.passed === true && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" />
                      Passed
                    </span>
                  )}
                  {attempt.passed === false && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                      <span className="h-1 w-1 rounded-full bg-rose-400" />
                      Not passed
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-neutral-500">Not graded yet</span>
              )
            }
          />

          {attempt.status !== "IN_PROGRESS" && (
            <div className="sm:col-span-2">
              <Link
                href={`/admin/attempts/${attempt.id}/review`}
                className="group inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08]"
              >
                View answer review
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    d="M6 3.5 10.5 8 6 12.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          )}
        </dl>
      </section>

      {/* ============ RELEASING RESULTS ============ */}
      {attempt.status === "GRADED" && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
          <div className="mb-5">
            <SectionHeader dot="from-emerald-400 to-teal-400" label="Releasing results" />
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Control when the student can see their score and answer review.
            </p>
          </div>

          {/* Policy summary */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                Policy · results
              </dt>
              <dd className="mt-1 text-sm text-neutral-200 capitalize">
                {attempt.version.resultRelease
                  .toLowerCase()
                  .replaceAll("_", " ")}
              </dd>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                Policy · explanations
              </dt>
              <dd className="mt-1 text-sm text-neutral-200 capitalize">
                {attempt.version.explanationRelease
                  .toLowerCase()
                  .replaceAll("_", " ")}
              </dd>
            </div>
          </dl>

          {/* Visibility status */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
              Student can see
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                release.resultsReleased
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-neutral-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  release.resultsReleased
                    ? "bg-emerald-400"
                    : "bg-neutral-600"
                }`}
              />
              Results {release.resultsReleased ? "yes" : "no"}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                release.explanationsReleased
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-neutral-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  release.explanationsReleased
                    ? "bg-emerald-400"
                    : "bg-neutral-600"
                }`}
              />
              Explanations {release.explanationsReleased ? "yes" : "no"}
            </span>
          </div>

          {release.availableAfter && (
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
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
              Results unlock automatically after{" "}
              <span className="tabular-nums text-neutral-400">
                {release.availableAfter
                  .toISOString()
                  .slice(0, 16)
                  .replace("T", " ")}{" "}
                UTC
              </span>
              .
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { kind: "results", mode: "release", label: "Release results now" },
              {
                kind: "results",
                mode: "withdraw",
                label: "Withdraw manual release of results",
              },
              {
                kind: "explanations",
                mode: "release",
                label: "Release explanations now",
              },
              {
                kind: "explanations",
                mode: "withdraw",
                label: "Withdraw manual release of explanations",
              },
            ].map((b) => {
              const isRelease = b.mode === "release";
              return (
                <form key={`${b.kind}-${b.mode}`} action={setAttemptRelease}>
                  <input type="hidden" name="id" value={attempt.id} />
                  <input type="hidden" name="kind" value={b.kind} />
                  <input type="hidden" name="mode" value={b.mode} />
                  <button
                    type="submit"
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${
                      isRelease
                        ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/[0.18]"
                        : "border border-white/10 bg-white/[0.04] text-neutral-200 hover:bg-white/[0.08]"
                    }`}
                  >
                    {isRelease ? (
                      <>
                        <svg
                          aria-hidden
                          viewBox="0 0 16 16"
                          fill="none"
                          className="h-3.5 w-3.5"
                        >
                          <path
                            d="M3.5 8.5 6.5 11.5 12.5 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {b.label}
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
                            d="M13 8H3m0 0 4-4M3 8l4 4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {b.label}
                      </>
                    )}
                  </button>
                </form>
              );
            })}
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
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
              A policy of &ldquo;immediately&rdquo; cannot be withdrawn here.
              Change the exam&apos;s policy in a new version instead.
            </span>
          </p>
        </section>
      )}

      {/* ============ TIMELINE ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Timeline" />
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Events come from the student&apos;s browser and can have innocent
            causes — a system notification, a second monitor, or clicking the
            address bar. Use them as a prompt for a conversation, not as proof.
          </p>
        </div>

        {attempt.events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-neutral-400">No events recorded.</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {attempt.events.map((e) => {
              const style = EVENT_STYLES[e.type] ?? {
                dot: "from-neutral-400 to-neutral-600",
                label: e.type,
              };

              const detail = describe(e.type, e.details);

              return (
                <li
                  key={e.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-gradient-to-br ${style.dot}`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          {LABELS[e.type] ?? e.type}
                        </p>
                        <p className="font-mono text-[11px] tabular-nums text-neutral-500">
                          {stamp(e.occurredAt)}
                        </p>
                      </div>

                      {detail && (
                        <p className="mt-1 text-xs text-neutral-400">
                          {detail}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/attempts"
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
        Back to attempts
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

function AttemptStatusPill({
  status,
  endReason,
}: {
  status: string;
  endReason: string | null;
}) {
  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
        </span>
        In progress
      </span>
    );
  }

  if (status === "GRADED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Graded
      </span>
    );
  }

  if (status === "EXPIRED" || endReason === "TIMEOUT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Time ran out
      </span>
    );
  }

  if (endReason === "FOCUS_VIOLATION") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Focus ended
      </span>
    );
  }

  if (status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
        Submitted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-400">
      {status}
    </span>
  );
}