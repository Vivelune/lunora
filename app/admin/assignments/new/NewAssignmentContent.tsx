import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  PRIORITIES,
  readInput,
  resolveAssignment,
} from "@/lib/assignments";
import { createAssignments } from "../actions";

type Params = Record<string, string | string[] | undefined>;

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 [color-scheme:dark]";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function NewAssignmentContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  // Authenticate and authorize every request before loading admin data.
  await requireAdmin();

  const raw = await searchParams;

  const get = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";

  const [plans, students, groups] = await Promise.all([
    prisma.lessonPlan.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),

    prisma.studentProfile.findMany({
      where: {
        role: "STUDENT",
        onboardingCompletedAt: { not: null },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    }),

    prisma.studentGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: { memberships: true },
        },
      },
    }),
  ]);

  const parsed = get("preview") === "1" ? readInput(get) : null;

  const resolved =
    parsed?.success
      ? await resolveAssignment(parsed.data)
      : null;

  const previewError =
    parsed && !parsed.success
      ? parsed.error.issues[0].message
      : resolved && !resolved.ok
        ? resolved.message
        : null;

  const name = (student: {
    firstName: string | null;
    lastName: string | null;
  }) => `${student.lastName ?? ""}, ${student.firstName ?? ""}`;

  const errorMessage = get("error") || previewError;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Assignments
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Assign a lesson plan
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Choose a plan, pick who should receive it, and review before
          confirming.
        </p>
      </header>

      {/* ============ ERROR ============ */}
      {errorMessage && (
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
          <span>{errorMessage}</span>
        </p>
      )}

      {/* ============ STEP 1 — FORM ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Step 1 · Choose" />
          <p className="mt-2 text-sm text-neutral-500">
            Fill in the plan and target. Nothing is created until you confirm
            in step 2.
          </p>
        </div>

        <form
          method="get"
          action="/admin/assignments/new"
          className="flex flex-col gap-6"
        >
          <input type="hidden" name="preview" value="1" />

          {/* Plan */}
          <div>
            <label htmlFor="planId" className={labelBase}>
              Plan
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                published only
              </span>
            </label>
            <select
              id="planId"
              name="planId"
              required
              defaultValue={get("planId")}
              className={inputBase}
            >
              <option value="" disabled>
                Select…
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </select>
          </div>

          {/* Target type */}
          <div>
            <label htmlFor="targetType" className={labelBase}>
              Assign to
            </label>
            <select
              id="targetType"
              name="targetType"
              required
              defaultValue={get("targetType")}
              className={inputBase}
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="student">One student</option>
              <option value="group">A group</option>
              <option value="all">All eligible students</option>
            </select>
          </div>

          {/* Student / Group grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="studentId" className={labelBase}>
                Student
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  if &ldquo;one student&rdquo;
                </span>
              </label>
              <select
                id="studentId"
                name="studentId"
                defaultValue={get("studentId")}
                className={inputBase}
              >
                <option value="">—</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {name(student)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="groupId" className={labelBase}>
                Group
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  if &ldquo;a group&rdquo;
                </span>
              </label>
              <select
                id="groupId"
                name="groupId"
                defaultValue={get("groupId")}
                className={inputBase}
              >
                <option value="">—</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group._count.memberships})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs text-neutral-500">
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
            Only the field matching &ldquo;Assign to&rdquo; is used.
          </p>

          {/* Dates + priority */}
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="startDate" className={labelBase}>
                Start date
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  optional
                </span>
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={get("startDate")}
                className={inputBase}
              />
            </div>

            <div>
              <label htmlFor="dueDate" className={labelBase}>
                Due date
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  optional
                </span>
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={get("dueDate")}
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
                defaultValue={get("priority") || "NORMAL"}
                className={inputBase}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0) +
                      priority.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs text-neutral-500">
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
            Dates use UTC. A due date runs to the end of that day.
          </p>

          {/* Instructions */}
          <div>
            <label htmlFor="instructions" className={labelBase}>
              Instructions for students
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                optional
              </span>
            </label>
            <textarea
              id="instructions"
              name="instructions"
              rows={3}
              maxLength={1000}
              defaultValue={get("instructions")}
              className={inputBase}
              placeholder="Any specific guidance students should see."
            />
          </div>

          {/* Submit */}
          <div className="border-t border-white/10 pt-5">
            <button
              type="submit"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
            >
              Review before assigning
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

      {/* ============ STEP 2 — REVIEW ============ */}
      {resolved?.ok && parsed?.success && (
        <section className="rounded-2xl border border-violet-400/30 bg-violet-500/[0.04] p-6 backdrop-blur sm:p-7">
          <div className="mb-5">
            <SectionHeader dot="from-indigo-400 to-fuchsia-400" label="Step 2 · Review" />
            <p className="mt-2 text-sm text-neutral-400">
              Check the details below. Nothing has been assigned yet.
            </p>
          </div>

          {/* Summary rows */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <SummaryRow
              label="Plan"
              value={
                <>
                  <span className="font-medium text-white">
                    {resolved.planTitle}
                  </span>
                  <span className="ml-2 inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                    v{resolved.versionNumber}
                  </span>
                </>
              }
            />
            <SummaryRow
              label="Target"
              value={
                <span className="font-medium text-white">
                  {resolved.targetLabel}
                </span>
              }
            />
            <SummaryRow
              label="Start"
              value={
                resolved.startDate
                  ? <span className="tabular-nums">{resolved.startDate.toISOString().slice(0, 10)}</span>
                  : <span className="text-neutral-500">Not set</span>
              }
            />
            <SummaryRow
              label="Due"
              value={
                resolved.dueDate
                  ? <span className="tabular-nums">{resolved.dueDate.toISOString().slice(0, 10)}</span>
                  : <span className="text-neutral-500">Not set</span>
              }
            />
            <SummaryRow
              label="Priority"
              value={<PriorityPill priority={parsed.data.priority} />}
            />
          </dl>

          {/* Count callout */}
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-400/30 to-fuchsia-400/30 text-white">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
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
            </span>

            <div className="min-w-0">
              <p className="text-sm text-neutral-200">
                <span className="font-semibold text-white tabular-nums">
                  {resolved.newStudents.length}
                </span>{" "}
                student
                {resolved.newStudents.length === 1 ? "" : "s"} will receive
                this plan.
              </p>

              {resolved.skippedCount > 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  <span className="tabular-nums">{resolved.skippedCount}</span>{" "}
                  already {resolved.skippedCount === 1 ? "has" : "have"} it
                  and will be skipped.
                </p>
              )}
            </div>
          </div>

          {/* Expandable list */}
          {resolved.newStudents.length > 0 && (
            <details className="group mt-5">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400 transition-colors hover:text-neutral-200">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3 w-3 transition-transform group-open:rotate-90"
                >
                  <path
                    d="M6 3.5 10.5 8 6 12.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Show who will be assigned
              </summary>

              <ul className="mt-3 flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                {resolved.newStudents.slice(0, 25).map((student) => (
                  <li
                    key={student.id}
                    className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/[0.03]"
                  >
                    {name(student)}
                  </li>
                ))}
                {resolved.newStudents.length > 25 && (
                  <li className="px-2.5 py-1.5 text-xs text-neutral-500">
                    and {resolved.newStudents.length - 25} more
                  </li>
                )}
              </ul>
            </details>
          )}

          {/* Confirm form */}
          {resolved.newStudents.length > 0 && (
            <form
              action={createAssignments}
              className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6"
            >
              <input type="hidden" name="planId" value={parsed.data.planId} />
              <input
                type="hidden"
                name="targetType"
                value={parsed.data.targetType}
              />
              <input
                type="hidden"
                name="studentId"
                value={parsed.data.studentId}
              />
              <input
                type="hidden"
                name="groupId"
                value={parsed.data.groupId}
              />
              <input
                type="hidden"
                name="startDate"
                value={parsed.data.startDate}
              />
              <input
                type="hidden"
                name="dueDate"
                value={parsed.data.dueDate}
              />
              <input
                type="hidden"
                name="priority"
                value={parsed.data.priority}
              />
              <input
                type="hidden"
                name="instructions"
                value={parsed.data.instructions}
              />
              <input
                type="hidden"
                name="expectedCount"
                value={resolved.newStudents.length}
              />

              {parsed.data.targetType === "all" && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm transition-colors hover:border-white/20 hover:bg-white/[0.04]">
                  <input
                    type="checkbox"
                    name="confirmAll"
                    value="yes"
                    required
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-violet-500"
                  />
                  <span className="text-neutral-200">
                    I understand this assigns the plan to{" "}
                    <strong className="font-semibold text-white">
                      {resolved.newStudents.length}
                    </strong>{" "}
                    students.
                  </span>
                </label>
              )}

              <button
                type="submit"
                className="group inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
              >
                Confirm and assign to {resolved.newStudents.length}
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
            </form>
          )}
        </section>
      )}

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

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </dt>
      <dd className="text-right text-sm text-neutral-200">{value}</dd>
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