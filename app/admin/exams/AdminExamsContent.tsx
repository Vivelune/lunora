import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

const FILTERS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;

type ExamStatus = (typeof FILTERS)[number];

const FILTER_LABELS: Record<ExamStatus, string> = {
  ALL: "All",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

function isExamStatus(value: string | undefined): value is ExamStatus {
  return FILTERS.some((filter) => filter === value);
}

export default async function AdminExamsContent({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    error?: string;
    saved?: string;
  }>;
}) {
  await requireAdmin();

  const { status, error, saved } = await searchParams;
  const active = isExamStatus(status) ? status : "ALL";

  const exams = await prisma.exam.findMany({
    where: active === "ALL" ? {} : { status: active },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      subject: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          versionNumber: true,
          publishedAt: true,
          durationMinutes: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Exams
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            {exams.length === 0
              ? "No exams match this filter."
              : `${exams.length} exam${exams.length === 1 ? "" : "s"}${
                  active === "ALL"
                    ? ""
                    : ` · ${FILTER_LABELS[active].toLowerCase()}`
                }`}
          </p>
        </div>

        <Link
          href="/admin/exams/new"
          className="group inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
          >
            <path
              d="M8 3.5v9M3.5 8h9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          New exam
        </Link>
      </header>

      {/* ============ STATUS MESSAGES ============ */}
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

      {/* ============ FILTER TABS ============ */}
      <nav aria-label="Filter exams" className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => {
          const isActive = filter === active;
          return (
            <Link
              key={filter}
              href={
                filter === "ALL"
                  ? "/admin/exams"
                  : `/admin/exams?status=${filter}`
              }
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border border-white/15 bg-white/[0.06] text-white"
                  : "border border-transparent text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200"
              }`}
            >
              {FILTER_LABELS[filter]}
            </Link>
          );
        })}
      </nav>

      {/* ============ EMPTY STATE ============ */}
      {exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">
            {active === "ALL"
              ? "No exams here yet."
              : `No ${FILTER_LABELS[active].toLowerCase()} exams.`}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {active === "ALL"
              ? "Create your first exam to get started."
              : "Try a different filter, or create a new exam."}
          </p>
        </div>
      ) : (
        /* ============ TABLE ============ */
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
                  >
                    Exam
                  </th>
                  <th
                    scope="col"
                    className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 sm:table-cell"
                  >
                    Subject
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
                  >
                    Version
                  </th>
                  <th
                    scope="col"
                    className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 md:table-cell"
                  >
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => {
                  const version = exam.versions[0];

                  return (
                    <tr
                      key={exam.id}
                      className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* Title */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/exams/${exam.id}`}
                          className="group/link inline-flex items-center gap-2 font-medium text-white transition-colors hover:text-violet-200"
                        >
                          <span className="truncate">
                            {exam.title}
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

                      {/* Subject */}
                      <td className="hidden px-5 py-4 text-neutral-400 sm:table-cell">
                        {exam.subject.parent
                          ? `${exam.subject.parent.name} ${exam.subject.name}`
                          : exam.subject.name}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusPill status={exam.status} />
                      </td>

                      {/* Version */}
                      <td className="px-5 py-4">
                        {version ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-300">
                              v{version.versionNumber}
                            </span>
                            {version.publishedAt ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                                <span className="h-1 w-1 rounded-full bg-amber-400" />
                                Editing
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="hidden px-5 py-4 md:table-cell">
                        {version ? (
                          <span className="inline-flex items-center gap-1.5 text-neutral-400">
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
                            <span className="tabular-nums">
                              {version.durationMinutes}
                            </span>{" "}
                            min
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
   StatusPill — shared visual language across admin tables
   ============================================================ */
function StatusPill({ status }: { status: string }) {
  if (status === "PUBLISHED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Published
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Draft
      </span>
    );
  }
  if (status === "ARCHIVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
      {status}
    </span>
  );
}