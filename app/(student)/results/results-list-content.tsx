import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getStudentResultsList } from "@/lib/student-results";

const day = (d: Date | null) =>
  d ? d.toISOString().slice(0, 10) : "—";

const stamp = (d: Date) =>
  d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default async function ResultsListContent() {
  const { profile } = await requireCompletedProfile();
  const items = await getStudentResultsList(profile.id);

  const released = items.filter(
    (i) => i.released && i.percentage !== null
  );
  const pending = items.length - released.length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Results
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          My results
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {items.length === 0
            ? "No completed exams yet."
            : `${released.length} result${
                released.length === 1 ? "" : "s"
              } available${pending > 0 ? ` · ${pending} pending` : ""}`}
        </p>
      </header>

      {/* ============ EMPTY STATE ============ */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">
            You have no completed exams yet.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Your results will appear here once you finish an exam.
          </p>
        </div>
      ) : (
        /* ============ RESULTS LIST ============ */
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => {
            const isReleased =
              item.released && item.percentage !== null;

            return (
              <li key={item.attemptId}>
                <Link
                  href={
                    isReleased
                      ? `/attempts/${item.attemptId}/results`
                      : `/attempts/${item.attemptId}`
                  }
                  className={`group flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-colors ${
                    isReleased
                      ? "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      : "border-white/5 bg-white/[0.01] opacity-75 hover:opacity-100"
                  }`}
                >
                  {/* ============ LEFT: exam + meta ============ */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {item.examTitle}
                      </p>

                      {!isReleased && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
                          <span className="h-1 w-1 rounded-full bg-neutral-600" />
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                      <span className="truncate">{item.subject}</span>
                      <span className="text-neutral-700">·</span>
                      <span className="tabular-nums">
                        Attempt {item.attemptNumber}
                      </span>
                      <span className="text-neutral-700">·</span>
                      <span className="tabular-nums">
                        {day(item.endedAt)}
                      </span>
                    </div>
                  </div>

                  {/* ============ RIGHT: score or pending ============ */}
                  <div className="flex flex-shrink-0 items-center gap-4">
                    {isReleased ? (
                      <>
                        {/* Score */}
                        <div className="text-right">
                          <p className="text-xl font-semibold tracking-tight text-white tabular-nums">
                            {item.percentage}
                            <span className="text-sm text-neutral-500">
                              %
                            </span>
                          </p>
                          <p className="mt-0.5 text-[11px] tabular-nums text-neutral-500">
                            {item.pointsEarned} of {item.pointsPossible}
                            {item.passed === true && (
                              <span className="ml-1.5 text-emerald-400">
                                · Passed
                              </span>
                            )}
                            {item.passed === false && (
                              <span className="ml-1.5 text-rose-400">
                                · Not passed
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Action */}
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 transition-colors group-hover:text-violet-200">
                          View
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
                        </span>
                      </>
                    ) : (
                      <span className="text-right text-xs leading-relaxed text-neutral-500">
                        {item.availableAfter
                          ? `Available after ${stamp(item.availableAfter)}`
                          : "Waiting for your tutor"}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

            {/* ============ FOOTER LINKS ============ */}
            <div className="flex flex-wrap items-center gap-5">
        <Link
          href="/performance"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 transition-colors hover:text-violet-200"
        >
          My performance
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M13 8H3m0 0 4-4M3 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}