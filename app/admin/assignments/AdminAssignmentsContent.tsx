import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { setAssignmentStatus } from "./actions";

const PAGE_SIZE = 50;

const inputBase =
  "rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neutral-100 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

type AssignmentSearchParams = {
  error?: string;
  saved?: string;
  status?: string;
  planId?: string;
  page?: string;
};

export default async function AdminAssignmentsContent({
  searchParams,
}: {
  searchParams: Promise<AssignmentSearchParams>;
}) {
  // Keep authorization inside the server component.
  // Do not cache this request-specific authentication check.
  await requireAdmin();

  const { error, saved, status, planId, page } = await searchParams;

  const pageNumber = Math.max(
    1,
    Number.parseInt(page ?? "1", 10) || 1
  );

  // "as const" keeps these as the exact enum values instead of widening to string.
  const statusFilter =
    status === "ACTIVE"
      ? ("ACTIVE" as const)
      : status === "CANCELLED"
        ? ("CANCELLED" as const)
        : undefined;

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(planId ? { planId } : {}),
  };

  const [total, rows, plans] = await Promise.all([
    prisma.lessonPlanAssignment.count({ where }),

    prisma.lessonPlanAssignment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        dueDate: true,
        startedAt: true,
        completedAt: true,
        priority: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        plan: {
          select: {
            title: true,
          },
        },
        version: {
          select: {
            versionNumber: true,
          },
        },
        group: {
          select: {
            name: true,
          },
        },
      },
    }),

    prisma.lessonPlan.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  const now = new Date();

  const progressLabel = (assignment: (typeof rows)[number]) => {
    if (assignment.status === "CANCELLED") {
      return "Cancelled";
    }

    if (assignment.completedAt) {
      return "Completed";
    }

    if (assignment.startedAt) {
      return "In progress";
    }

    return "Not started";
  };

  const isOverdue = (assignment: (typeof rows)[number]) =>
    assignment.status === "ACTIVE" &&
    !assignment.completedAt &&
    assignment.dueDate !== null &&
    assignment.dueDate.getTime() < now.getTime();

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const linkFor = (targetPage: number) => {
    const params = new URLSearchParams();

    if (statusFilter) {
      params.set("status", statusFilter);
    }

    if (planId) {
      params.set("planId", planId);
    }

    params.set("page", String(targetPage));

    return `/admin/assignments?${params.toString()}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Assignments
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            {total === 0
              ? "No assignments yet."
              : `${total} assignment${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <Link
          href="/admin/assignments/new"
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
          Assign a plan
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
          <div className="min-w-[140px]">
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
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="min-w-[200px] flex-1">
            <label htmlFor="planId" className={labelBase}>
              Plan
            </label>
            <select
              id="planId"
              name="planId"
              defaultValue={planId ?? ""}
              className={`${inputBase} w-full`}
            >
              <option value="">All plans</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </select>
          </div>

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

      {/* ============ EMPTY STATE ============ */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">
            No assignments match.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Try clearing the filters, or assign a plan to get started.
          </p>
        </div>
      ) : (
        /* ============ TABLE ============ */
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Student
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 sm:table-cell">
                    Plan
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 md:table-cell">
                    Group
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:table-cell">
                    Due
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:table-cell">
                    Priority
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Progress
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((assignment) => {
                  const overdue = isOverdue(assignment);

                  return (
                    <tr
                      key={assignment.id}
                      className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* Student */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/assignments/${assignment.id}`}
                          className="group/link inline-flex items-center gap-2 font-medium text-white transition-colors hover:text-violet-200"
                        >
                          <span className="truncate">
                            {assignment.student.lastName},{" "}
                            {assignment.student.firstName}
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

                      {/* Plan */}
                      <td className="hidden px-5 py-4 text-neutral-400 sm:table-cell">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate">
                            {assignment.plan.title}
                          </span>
                          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                            v{assignment.version.versionNumber}
                          </span>
                        </span>
                      </td>

                      {/* Group */}
                      <td className="hidden px-5 py-4 text-neutral-400 md:table-cell">
                        {assignment.group?.name ?? (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Due */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        {assignment.dueDate ? (
                          <span className="tabular-nums text-neutral-400">
                            {assignment.dueDate.toISOString().slice(0, 10)}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        <PriorityPill priority={assignment.priority} />
                      </td>

                      {/* Progress */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <ProgressPill
                            label={progressLabel(assignment)}
                            cancelled={assignment.status === "CANCELLED"}
                            completed={!!assignment.completedAt}
                          />
                          {overdue && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        {assignment.status === "ACTIVE" &&
                          !assignment.completedAt && (
                            <form action={setAssignmentStatus}>
                              <input
                                type="hidden"
                                name="id"
                                value={assignment.id}
                              />
                              <input
                                type="hidden"
                                name="to"
                                value="CANCELLED"
                              />
                              <button
                                type="submit"
                                className="inline-flex h-8 items-center rounded-lg border border-transparent px-3 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/20 hover:bg-rose-500/[0.08]"
                              >
                                Cancel
                              </button>
                            </form>
                          )}

                        {assignment.status === "CANCELLED" && (
                          <form action={setAssignmentStatus}>
                            <input
                              type="hidden"
                              name="id"
                              value={assignment.id}
                            />
                            <input
                              type="hidden"
                              name="to"
                              value="ACTIVE"
                            />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center rounded-lg border border-transparent px-3 text-xs font-medium text-emerald-300 transition-colors hover:border-emerald-400/20 hover:bg-emerald-500/[0.08]"
                            >
                              Restore
                            </button>
                          </form>
                        )}

                        {assignment.completedAt && (
                          <span className="text-xs text-neutral-500">
                            —
                          </span>
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
          aria-label="Assignment pages"
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
            Page <span className="tabular-nums text-neutral-300">{pageNumber}</span>{" "}
            of <span className="tabular-nums text-neutral-300">{pageCount}</span>
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
   PriorityPill — small status indicator
   ============================================================ */
function PriorityPill({ priority }: { priority: string }) {
  if (priority === "HIGH") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        High
      </span>
    );
  }

  if (priority === "LOW") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
        Low
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
      Normal
    </span>
  );
}

/* ============================================================
   ProgressPill — student progress state
   ============================================================ */
function ProgressPill({
  label,
  cancelled,
  completed,
}: {
  label: string;
  cancelled: boolean;
  completed: boolean;
}) {
  if (cancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        Cancelled
      </span>
    );
  }

  if (completed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Completed
      </span>
    );
  }

  if (label === "In progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        In progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
      Not started
    </span>
  );
}