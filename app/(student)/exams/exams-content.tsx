import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getStudentExams } from "@/lib/student-exams";
import { ExamCard } from "./exam-card";
import prisma from "@/lib/prisma";

const emptyState =
  "rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center";

export default async function ExamsContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireCompletedProfile();
  const { error } = await searchParams;
  const { assigned, practice } = await getStudentExams(profile.id);
  const recent = await prisma.examAttempt.findMany({
    where: { studentId: profile.id },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      endReason: true,
      exam: { select: { title: true } },
    },
  });

  const inProgress = [...assigned, ...practice].filter(
    (e) => e.inProgressAttemptId !== null
  );
  const rest = (e: { inProgressAttemptId: string | null }) =>
    e.inProgressAttemptId === null;

  const available = assigned.filter(
    (e) => rest(e) && e.state === "AVAILABLE"
  );
  const upcoming = assigned.filter(
    (e) => rest(e) && e.state === "UPCOMING"
  );
  const closed = assigned.filter(
    (e) =>
      rest(e) && (e.state === "CLOSED" || e.state === "UNAVAILABLE")
  );
  const practiceList = practice.filter(rest);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Exams
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          My exams
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {inProgress.length > 0
            ? `You have ${inProgress.length} exam${
                inProgress.length === 1 ? "" : "s"
              } in progress.`
            : available.length > 0
              ? `${available.length} exam${
                  available.length === 1 ? "" : "s"
                } open for you right now.`
              : "Nothing open right now."}
        </p>
      </header>

      {/* ============ ERROR ============ */}
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

      {/* ============ IN PROGRESS ============ */}
      {inProgress.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">
              Resume your exam
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {inProgress.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        </section>
      )}

      {/* ============ ASSIGNED ============ */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Assigned to you
          </h2>
        </div>

        {available.length === 0 ? (
          <div className={emptyState}>
            <p className="text-sm text-neutral-400">
              No exams are open for you right now.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              When your tutor assigns an exam that&apos;s open, it will appear
              here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {available.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        )}
      </section>

      {/* ============ UPCOMING ============ */}
      {upcoming.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Coming up
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        </section>
      )}

      {/* ============ PRACTICE ============ */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Practice exams
          </h2>
        </div>

        {practiceList.length === 0 ? (
          <div className={emptyState}>
            <p className="text-sm text-neutral-400">
              No practice exams available.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Open practice exams will appear here as they&apos;re published.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {practiceList.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        )}
      </section>

      {/* ============ RECENT ATTEMPTS ============ */}
      {recent.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Your recent attempts
            </h2>
          </div>

          <ul className="flex flex-col gap-2">
            {recent.map((a) => {
              const isInProgress = a.status === "IN_PROGRESS";
              const timedOut = a.endReason === "TIMEOUT";
              const graded = a.status === "GRADED";

              return (
                <li key={a.id}>
                  <Link
                    href={`/attempts/${a.id}`}
                    className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    {/* Left: number badge + title + state */}
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border text-[11px] font-bold tabular-nums ${
                          isInProgress
                            ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                            : "border-white/10 bg-white/[0.04] text-neutral-400"
                        }`}
                      >
                        #{a.attemptNumber}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {a.exam.title}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                          <AttemptStatePill
                            inProgress={isInProgress}
                            timedOut={timedOut}
                            graded={graded}
                          />
                          {a.submittedAt && (
                            <>
                              <span className="text-neutral-700">·</span>
                              <span className="tabular-nums">
                                {a.submittedAt.toISOString().slice(0, 10)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: action + chevron */}
                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span
                        className={`text-xs font-medium ${
                          isInProgress ? "text-amber-300" : "text-neutral-400"
                        }`}
                      >
                        {isInProgress ? "Resume" : "View"}
                      </span>
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300"
                      >
                        <path
                          d="M6 3.5 10.5 8 6 12.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ============ CLOSED ============ */}
      {closed.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-neutral-400 to-neutral-600" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Closed or unavailable
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {closed.map((e) => (
              <ExamCard key={e.key} exam={e} />
            ))}
          </div>
        </section>
      )}

      {/* ============ BACK LINK ============ */}
      <Link
        href="/dashboard"
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
        Back to dashboard
      </Link>
    </div>
  );
}

/* ============================================================
   AttemptStatePill — recent-attempts status badge
   ============================================================ */
function AttemptStatePill({
  inProgress,
  timedOut,
  graded,
}: {
  inProgress: boolean;
  timedOut: boolean;
  graded: boolean;
}) {
  if (inProgress) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
        </span>
        In progress
      </span>
    );
  }

  if (timedOut) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Time ran out
      </span>
    );
  }

  if (graded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Graded
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
      Submitted
    </span>
  );
}