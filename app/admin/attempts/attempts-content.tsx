import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { finalizeAllExpired } from "@/lib/attempts";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 50;
const STATUSES = ["IN_PROGRESS", "SUBMITTED", "EXPIRED", "GRADED"] as const;
const stamp = (d: Date | null) =>
  d ? d.toISOString().slice(0, 16).replace("T", " ") : "—";

const inputBase =
  "rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neutral-100 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  EXPIRED: "Expired",
  GRADED: "Graded",
};

type Search = {
  status?: string;
  examId?: string;
  flagged?: string;
  page?: string;
};

export default async function AttemptsContent({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdmin();
  const { status, examId, flagged, page } = await searchParams;

  // Never show an attempt as "in progress" after its time ran out.
  await finalizeAllExpired();

  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const statusFilter = STATUSES.find((s) => s === status);
  const flaggedOnly = flagged === "1";

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(examId ? { examId } : {}),
    ...(flaggedOnly ? { flaggedForReview: true } : {}),
  };

  const [total, rows, exams] = await Promise.all([
    prisma.examAttempt.count({ where }),
    prisma.examAttempt.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        endReason: true,
        focusViolations: true,
        flaggedForReview: true,
        student: { select: { firstName: true, lastName: true } },
        exam: { select: { title: true } },
      },
    }),
    prisma.exam.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkFor = (p: number) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (examId) params.set("examId", examId);
    if (flaggedOnly) params.set("flagged", "1");
    params.set("page", String(p));
    return `/admin/attempts?${params.toString()}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Exam attempts
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {total === 0
            ? "No attempts yet."
            : `${total} attempt${total === 1 ? "" : "s"}${
                statusFilter
                  ? ` · ${STATUS_LABELS[statusFilter].toLowerCase()}`
                  : ""
              }${flaggedOnly ? " · flagged only" : ""}`}
        </p>
      </header>

      {/* ============ FILTER BAR ============ */}
      <form
        method="get"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Filters
          </h2>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <label htmlFor="status" className={labelBase}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter ?? ""}
              className={`${inputBase} w-full`}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[200px] flex-1">
            <label htmlFor="examId" className={labelBase}>
              Exam
            </label>
            <select
              id="examId"
              name="examId"
              defaultValue={examId ?? ""}
              className={`${inputBase} w-full`}
            >
              <option value="">All exams</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>

          <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 text-sm transition-colors hover:border-white/20 hover:bg-white/[0.04]">
            <input
              type="checkbox"
              name="flagged"
              value="1"
              defaultChecked={flaggedOnly}
              className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-rose-500"
            />
            <span className="text-neutral-200">Flagged only</span>
          </label>

          <button
            type="submit"
            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08]"
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5"
            >
              <path
                d="M2.5 3.5h11l-4 5v4l-3 1.5v-5.5l-4-5Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            Apply filters
          </button>
        </div>
      </form>

      {/* ============ EMPTY STATE / TABLE ============ */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">No attempts match.</p>
          <p className="mt-1 text-xs text-neutral-500">
            Try clearing the filters to see all attempts.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Student
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 sm:table-cell">
                    Exam
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    #
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Status
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:table-cell">
                    Started (UTC)
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:table-cell">
                    Ended (UTC)
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 md:table-cell">
                    Left page
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Review
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const flagged = r.flaggedForReview;
                  const leftPage = r.focusViolations;

                  return (
                    <tr
                      key={r.id}
                      className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* Student */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/attempts/${r.id}`}
                          className="group/link inline-flex items-center gap-2 font-medium text-white transition-colors hover:text-violet-200"
                        >
                          <span className="truncate">
                            {r.student.lastName}, {r.student.firstName}
                          </span>
                          <svg
                            aria-hidden
                            viewBox="0 0 16 16"
                            fill="none"
                            className="h-3 w-3 flex-shrink-0 text-neutral-600 transition-transform group-hover/link:translate-x-0.5 group-hover/link:text-violet-300"
                          >
                            <path
                              d="M6 3.5 10.5 8 6 12.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Link>
                      </td>

                      {/* Exam */}
                      <td className="hidden px-5 py-4 text-neutral-400 sm:table-cell">
                        <span className="truncate">{r.exam.title}</span>
                      </td>

                      {/* Attempt number */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                          #{r.attemptNumber}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <AttemptStatusPill
                            status={r.status}
                            endReason={r.endReason}
                          />
                        </div>
                      </td>

                      {/* Started */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        <span className="tabular-nums text-neutral-400">
                          {stamp(r.startedAt)}
                        </span>
                      </td>

                      {/* Ended */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        {r.submittedAt ? (
                          <span className="tabular-nums text-neutral-400">
                            {stamp(r.submittedAt)}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Left page count */}
                      <td className="hidden px-5 py-4 md:table-cell">
                        {leftPage > 0 ? (
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
                            {leftPage}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Review flag */}
                      <td className="px-5 py-4">
                        {flagged ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            Flagged
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ PAGINATION ============ */}
      {pageCount > 1 && (
        <nav
          aria-label="Attempt pages"
          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 backdrop-blur"
        >
          {pageNumber > 1 ? (
            <Link
              href={linkFor(pageNumber - 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white"
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
              Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="text-xs text-neutral-500">
            Page{" "}
            <span className="tabular-nums text-neutral-300">{pageNumber}</span>{" "}
            of{" "}
            <span className="tabular-nums text-neutral-300">{pageCount}</span>
          </span>

          {pageNumber < pageCount ? (
            <Link
              href={linkFor(pageNumber + 1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Next
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
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
            <span />
          )}
        </nav>
      )}

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin"
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
        Back to admin
      </Link>
    </div>
  );
}

/* ============================================================
   AttemptStatusPill — status + end-reason aware
   ============================================================ */
function AttemptStatusPill({
  status,
  endReason,
}: {
  status: string;
  endReason: string | null;
}) {
  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Graded
      </span>
    );
  }

  if (status === "EXPIRED" || endReason === "TIMEOUT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Time ran out
      </span>
    );
  }

  if (endReason === "FOCUS_VIOLATION") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Focus ended
      </span>
    );
  }

  if (status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
        Submitted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
      {status}
    </span>
  );
}