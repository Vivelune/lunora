import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { computeItemStates } from "@/lib/plan-progress";
import prisma from "@/lib/prisma";
import { setAssignmentStatus } from "../actions";
import {
  moveAssignmentToLatest,
  updateAssignmentDetails,
} from "../manage-actions";

const date = (d: Date | null) =>
  d ? d.toISOString().slice(0, 10) : "—";

const stamp = (d: Date) =>
  d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 [color-scheme:dark]";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function AssignmentDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const { assignmentId } = await params;
  const { error, saved } = await searchParams;

  const assignment = await prisma.lessonPlanAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      planId: true,
      versionId: true,
      status: true,
      assignedAt: true,
      startDate: true,
      dueDate: true,
      startedAt: true,
      completedAt: true,
      priority: true,
      instructions: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          gradeLevel: true,
        },
      },
      group: {
        select: {
          name: true,
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
          items: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              isRequired: true,
              lesson: {
                select: {
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      progress: {
        select: {
          itemId: true,
          completedAt: true,
        },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const latest = await prisma.lessonPlanVersion.findFirst({
    where: {
      planId: assignment.planId,
      publishedAt: { not: null },
    },
    orderBy: {
      versionNumber: "desc",
    },
    select: {
      id: true,
      versionNumber: true,
    },
  });

  const items = assignment.version.items;

  const completedAtByItem = new Map(
    assignment.progress.map((p) => [p.itemId, p.completedAt]),
  );

  const states = computeItemStates(
    items,
    new Set(completedAtByItem.keys()),
  );

  const required = items.filter((item) => item.isRequired);

  const requiredDone = required.filter((item) =>
    completedAtByItem.has(item.id),
  ).length;

  const percent =
    required.length === 0
      ? 0
      : Math.round((requiredDone / required.length) * 100);

  const nextItem = items.find(
    (item) => states.get(item.id) === "AVAILABLE",
  );

  const overdue =
    assignment.status === "ACTIVE" &&
    !assignment.completedAt &&
    assignment.dueDate !== null &&
    assignment.dueDate.getTime() < Date.now();

  const canMove =
    assignment.status === "ACTIVE" &&
    !assignment.completedAt &&
    latest !== null &&
    latest.id !== assignment.versionId;

  const statusLabel =
    assignment.status === "CANCELLED"
      ? "Cancelled"
      : assignment.completedAt
        ? "Completed"
        : assignment.startedAt
          ? "In progress"
          : "Not started";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Assignment
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {assignment.student.lastName}, {assignment.student.firstName}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {assignment.plan.title}
          </span>

          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
            v{assignment.version.versionNumber}
          </span>

          {assignment.group && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3"
              >
                <circle
                  cx="6"
                  cy="6"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              {assignment.group.name}
            </span>
          )}

          <StatusPill
            label={statusLabel}
            cancelled={assignment.status === "CANCELLED"}
            completed={!!assignment.completedAt}
            inProgress={!!assignment.startedAt && !assignment.completedAt}
          />

          {overdue && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Overdue
            </span>
          )}
        </div>
      </header>

      {/* ============ STATUS MESSAGES ============ */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200"
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
            <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{saved}</span>
        </p>
      )}

      {/* ============ OVERVIEW ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Overview" />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <InfoRow label="Assigned" value={date(assignment.assignedAt)} />
          <InfoRow
            label="Priority"
            value={
              <PriorityPill priority={assignment.priority} />
            }
          />
          <InfoRow label="Starts" value={date(assignment.startDate)} />
          <InfoRow label="Due" value={date(assignment.dueDate)} />
          <InfoRow
            label="First lesson completed"
            value={assignment.startedAt ? stamp(assignment.startedAt) : "—"}
          />
          <InfoRow
            label="Plan completed"
            value={assignment.completedAt ? stamp(assignment.completedAt) : "—"}
          />
        </dl>

        {/* Progress */}
        <div className="mt-6 border-t border-white/5 pt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-neutral-400">
              Required lessons
            </span>
            <span className="font-medium tabular-nums text-neutral-200">
              {requiredDone} of {required.length} ({percent}%)
            </span>
          </div>

          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Next step */}
        {nextItem &&
          assignment.status === "ACTIVE" &&
          !assignment.completedAt && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-300"
              >
                <path
                  d="M4 3.5h8v9l-4-2.5-4 2.5v-9Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Next step for the student
                </p>
                <p className="mt-0.5 truncate text-sm text-neutral-200">
                  {nextItem.lesson?.title ?? "Lesson unavailable"}
                </p>
              </div>
            </div>
          )}
      </section>

      {/* ============ LESSONS IN THIS VERSION ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Lessons" />
          <p className="mt-2 text-sm text-neutral-500">
            {items.length} lesson{items.length === 1 ? "" : "s"} in version{" "}
            {assignment.version.versionNumber}
          </p>
        </div>

        <ol className="flex flex-col gap-2">
          {items.map((item, index) => {
            const state = states.get(item.id);
            const done = completedAtByItem.get(item.id);

            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
              >
                {/* Left: number + lesson + meta */}
                <div className="flex min-w-0 items-start gap-3.5">
                  <span
                    className={`mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      state === "COMPLETED"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : state === "AVAILABLE"
                          ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"
                          : "border border-white/15 bg-white/[0.04] text-neutral-400"
                    }`}
                  >
                    {state === "COMPLETED" ? (
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
                    ) : (
                      index + 1
                    )}
                  </span>

                  <div className="min-w-0">
                    <p
                      className={`font-medium ${
                        state === "LOCKED"
                          ? "text-neutral-400"
                          : "text-white"
                      }`}
                    >
                      {item.lesson?.title ?? "(missing lesson)"}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                      <span>
                        {item.isRequired ? "Required" : "Optional"}
                      </span>
                      {item.lesson &&
                        item.lesson.status !== "PUBLISHED" && (
                          <>
                            <span className="text-neutral-700">·</span>
                            <span className="text-amber-300/70">
                              lesson is {item.lesson.status.toLowerCase()}
                            </span>
                          </>
                        )}
                    </div>
                  </div>
                </div>

                {/* Right: state + completion time */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatePill state={state} />

                  {done && (
                    <span className="text-[11px] tabular-nums text-neutral-500">
                      {stamp(done)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ============ NEWER VERSION AVAILABLE ============ */}
      {canMove && latest && (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-6 backdrop-blur sm:p-7">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-400" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">
              Newer version available
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-neutral-300">
            Version{" "}
            <span className="font-medium text-white">
              {latest.versionNumber}
            </span>{" "}
            is published. Moving keeps completed lessons that also appear in
            the new version. Lessons not in the new version are no longer
            counted.
          </p>

          <form action={moveAssignmentToLatest} className="mt-4">
            <input
              type="hidden"
              name="assignmentId"
              value={assignment.id}
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/[0.18]"
            >
              Move to version {latest.versionNumber}
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
            </button>
          </form>
        </section>
      )}

      {/* ============ EDIT ASSIGNMENT ============ */}
      {assignment.status === "ACTIVE" && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
          <div className="mb-5">
            <SectionHeader dot="from-emerald-400 to-teal-400" label="Edit assignment" />
            <p className="mt-2 text-sm text-neutral-500">
              Update dates, priority, or instructions.
            </p>
          </div>

          <form
            action={updateAssignmentDetails}
            className="flex flex-col gap-6"
          >
            <input type="hidden" name="id" value={assignment.id} />

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="startDate" className={labelBase}>
                  Start date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={
                    assignment.startDate
                      ? assignment.startDate.toISOString().slice(0, 10)
                      : ""
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="dueDate" className={labelBase}>
                  Due date
                </label>
                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={
                    assignment.dueDate
                      ? assignment.dueDate.toISOString().slice(0, 10)
                      : ""
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="priority" className={labelBase}>
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue={assignment.priority}
                  className={inputBase}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="instructions" className={labelBase}>
                Instructions for the student
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  optional
                </span>
              </label>
              <textarea
                id="instructions"
                name="instructions"
                rows={3}
                maxLength={1000}
                defaultValue={assignment.instructions ?? ""}
                className={inputBase}
                placeholder="Any specific guidance for this student."
              />
            </div>

            <div className="border-t border-white/10 pt-5">
              <button
                type="submit"
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
              >
                Save changes
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
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ============ DANGER ZONE ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader
            dot={
              assignment.status === "CANCELLED"
                ? "from-neutral-400 to-neutral-600"
                : "from-rose-400 to-orange-400"
            }
            label={assignment.status === "CANCELLED" ? "Cancelled" : "Danger zone"}
          />
          <p className="mt-2 text-sm text-neutral-500">
            {assignment.status === "CANCELLED"
              ? "This assignment is cancelled. Restoring makes it active for the student again."
              : "Cancelling stops the student from working on this assignment. It can be restored later."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {assignment.status === "ACTIVE" && !assignment.completedAt && (
            <form action={setAssignmentStatus}>
              <input type="hidden" name="id" value={assignment.id} />
              <input type="hidden" name="to" value="CANCELLED" />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/[0.06] px-5 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/[0.12]"
              >
                Cancel assignment
              </button>
            </form>
          )}

          {assignment.status === "CANCELLED" && (
            <form action={setAssignmentStatus}>
              <input type="hidden" name="id" value={assignment.id} />
              <input type="hidden" name="to" value="ACTIVE" />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08]"
              >
                Restore assignment
              </button>
            </form>
          )}

          {assignment.completedAt && (
            <p className="text-sm text-neutral-500">
              This assignment is completed and cannot be cancelled.
            </p>
          )}
        </div>
      </section>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/assignments"
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
        Back to assignments
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
      <dd className="text-right text-sm tabular-nums text-neutral-200">
        {value}
      </dd>
    </div>
  );
}

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

function StatePill({ state }: { state: string | undefined }) {
  if (state === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Completed
      </span>
    );
  }
  if (state === "AVAILABLE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
      Locked
    </span>
  );
}

function StatusPill({
  label,
  cancelled,
  completed,
  inProgress,
}: {
  label: string;
  cancelled: boolean;
  completed: boolean;
  inProgress: boolean;
}) {
  if (cancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        Cancelled
      </span>
    );
  }
  if (completed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Completed
      </span>
    );
  }
  if (inProgress) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-400">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
      Not started
    </span>
  );
}