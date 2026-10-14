import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  moveExamAssignmentToLatest,
  setExamAssignmentStatus,
  updateExamAssignmentDetails,
} from "../actions";

const day = (d: Date | null) =>
  d ? d.toISOString().slice(0, 10) : "—";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 [color-scheme:dark]";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function ExamAssignmentDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { assignmentId } = await params;
  const { error, saved } = await searchParams;

  const assignment = await prisma.examAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      examId: true,
      versionId: true,
      status: true,
      focusExempt: true,
      assignedAt: true,
      availableFrom: true,
      dueDate: true,
      maxAttemptsOverride: true,
      instructions: true,
      student: {
        select: { firstName: true, lastName: true, gradeLevel: true },
      },
      group: { select: { name: true } },
      exam: { select: { title: true, availableUntil: true } },
      version: {
        select: {
          versionNumber: true,
          maxAttempts: true,
          durationMinutes: true,
        },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const latest = await prisma.examVersion.findFirst({
    where: { examId: assignment.examId, publishedAt: { not: null } },
    orderBy: { versionNumber: "desc" },
    select: { id: true, versionNumber: true },
  });

  const canMove =
    assignment.status === "ACTIVE" &&
    latest !== null &&
    latest.id !== assignment.versionId;

  const attemptCount =
    assignment.maxAttemptsOverride ?? assignment.version.maxAttempts;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Exam assignment
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {assignment.student.lastName}, {assignment.student.firstName}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {assignment.exam.title}
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

          <StatusPill status={assignment.status} />
        </div>
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

      {/* ============ OVERVIEW ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Overview" />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <InfoRow
            label="Status"
            value={<StatusPill status={assignment.status} />}
          />
          <InfoRow label="Assigned" value={day(assignment.assignedAt)} />
          <InfoRow
            label="Timer"
            value={
              <span className="tabular-nums">
                {assignment.version.durationMinutes} min
              </span>
            }
          />
          <InfoRow
            label="Attempts"
            value={
              <span className="inline-flex items-center gap-2">
                <span className="tabular-nums">{attemptCount}</span>
                {assignment.maxAttemptsOverride !== null && (
                  <span className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                    Override
                  </span>
                )}
              </span>
            }
          />
          <InfoRow
            label="Opens on"
            value={
              assignment.availableFrom ? (
                <span className="tabular-nums">
                  {day(assignment.availableFrom)}
                </span>
              ) : (
                <span className="text-neutral-500">Not set</span>
              )
            }
          />
          <InfoRow
            label="Last day to start"
            value={
              assignment.dueDate ? (
                <span className="tabular-nums">
                  {day(assignment.dueDate)}
                </span>
              ) : (
                <span className="text-neutral-500">Not set</span>
              )
            }
          />
        </dl>

        {/* Placeholder for attempt history */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
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
          <p className="text-xs text-neutral-500">
            Attempt history and results will appear here once students can
            take exams.
          </p>
        </div>
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
            is published. The student keeps version{" "}
            <span className="font-medium text-white">
              {assignment.version.versionNumber}
            </span>{" "}
            until you move them.
          </p>

          <form action={moveExamAssignmentToLatest} className="mt-4">
            <input type="hidden" name="id" value={assignment.id} />
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
              Update the availability window, attempt limit, or instructions.
            </p>
          </div>

          <form
            action={updateExamAssignmentDetails}
            className="flex flex-col gap-6"
          >
            <input type="hidden" name="id" value={assignment.id} />

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label htmlFor="availableFrom" className={labelBase}>
                  Opens on
                </label>
                <input
                  id="availableFrom"
                  name="availableFrom"
                  type="date"
                  defaultValue={day(assignment.availableFrom)}
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="dueDate" className={labelBase}>
                  Last day to start
                </label>
                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={day(assignment.dueDate)}
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="attemptsOverride" className={labelBase}>
                  Attempt limit
                  <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                    optional
                  </span>
                </label>
                <input
                  id="attemptsOverride"
                  name="attemptsOverride"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={assignment.maxAttemptsOverride ?? ""}
                  placeholder="Exam default"
                  className={inputBase}
                />
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

                     {/* Accommodation toggle */}
                     <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm transition-colors hover:border-white/20 hover:bg-white/[0.04]">
              <input
                type="checkbox"
                name="focusExempt"
                defaultChecked={assignment.focusExempt}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-violet-500"
              />
              <span className="min-w-0">
                <span className="block font-medium text-neutral-200">
                  Exempt from focus monitoring
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  Use for approved accommodations. This student&apos;s tab
                  switches and window changes won&apos;t be recorded.
                </span>
              </span>
            </label>

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
            label={
              assignment.status === "CANCELLED" ? "Cancelled" : "Danger zone"
            }
          />
          <p className="mt-2 text-sm text-neutral-500">
            {assignment.status === "CANCELLED"
              ? "This assignment is cancelled. Restoring makes it active for the student again."
              : "Cancelling stops the student from starting this exam. It can be restored later."}
          </p>
        </div>

        <form action={setExamAssignmentStatus}>
          <input type="hidden" name="id" value={assignment.id} />
          <input
            type="hidden"
            name="to"
            value={assignment.status === "ACTIVE" ? "CANCELLED" : "ACTIVE"}
          />
          <button
            type="submit"
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${
              assignment.status === "ACTIVE"
                ? "border border-rose-400/20 bg-rose-500/[0.06] text-rose-200 hover:bg-rose-500/[0.12]"
                : "border border-white/10 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.08]"
            }`}
          >
            {assignment.status === "ACTIVE"
              ? "Cancel assignment"
              : "Restore assignment"}
          </button>
        </form>
      </section>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/exam-assignments"
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
        Back to exam assignments
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

function StatusPill({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active
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