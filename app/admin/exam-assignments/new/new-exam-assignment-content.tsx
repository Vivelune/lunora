import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { readExamInput, resolveExamAssignment } from "@/lib/exam-assignments";
import { createExamAssignments } from "../actions";

type Params = Record<string, string | string[] | undefined>;

const day = (d: Date | null) =>
  d ? d.toISOString().slice(0, 10) : "not set";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 [color-scheme:dark]";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function NewExamAssignmentContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const get = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";

  const [exams, students, groups] = await Promise.all([
    prisma.exam.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.studentProfile.findMany({
      where: { role: "STUDENT", onboardingCompletedAt: { not: null } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.studentGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { memberships: true } },
      },
    }),
  ]);

  const parsed = get("preview") === "1" ? readExamInput(get) : null;
  const resolved = parsed?.success
    ? await resolveExamAssignment(parsed.data)
    : null;
  const previewError =
    parsed && !parsed.success
      ? parsed.error.issues[0].message
      : resolved && !resolved.ok
        ? resolved.message
        : null;

  const name = (p: {
    firstName: string | null;
    lastName: string | null;
  }) => `${p.lastName ?? ""}, ${p.firstName ?? ""}`;

  const errorMessage = get("error") || previewError;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Exam assignments
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Assign an exam
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Choose a live exam, pick who should receive it, and review before
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
            Fill in the exam and target. Nothing is created until you confirm
            in step 2.
          </p>
        </div>

        <form
          method="get"
          action="/admin/exam-assignments/new"
          className="flex flex-col gap-6"
        >
          <input type="hidden" name="preview" value="1" />

          {/* Exam */}
          <div>
            <label htmlFor="examId" className={labelBase}>
              Exam
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                published and live only
              </span>
            </label>
            <select
              id="examId"
              name="examId"
              required
              defaultValue={get("examId")}
              className={inputBase}
            >
              <option value="" disabled>
                Select…
              </option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
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

          {/* Student / Group */}
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
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {name(s)}
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
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g._count.memberships})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs text-neutral-500">
            <InfoIcon />
            Only the field matching &ldquo;Assign to&rdquo; is used.
          </p>

          {/* Dates + attempts */}
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="availableFrom" className={labelBase}>
                Opens on
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  optional
                </span>
              </label>
              <input
                id="availableFrom"
                name="availableFrom"
                type="date"
                defaultValue={get("availableFrom")}
                className={inputBase}
              />
            </div>

            <div>
              <label htmlFor="dueDate" className={labelBase}>
                Last day to start
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
                defaultValue={get("attemptsOverride")}
                placeholder="Exam default"
                className={inputBase}
              />
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
            <InfoIcon />
            <span>
              Dates use UTC. A student must <strong className="font-medium text-neutral-400">start</strong> by the
              last day; an attempt started in time keeps its full timer. Leave
              the attempt limit empty to use the exam&apos;s own limit.
            </span>
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
              label="Exam"
              value={
                <>
                  <span className="font-medium text-white">
                    {resolved.examTitle}
                  </span>
                  <span className="ml-2 inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                    v{resolved.versionNumber}
                  </span>
                </>
              }
              span2
            />
            <SummaryRow
              label="Target"
              value={
                <span className="font-medium text-white">
                  {resolved.targetLabel}
                </span>
              }
              span2
            />
            <SummaryRow
              label="Opens"
              value={
                resolved.availableFrom ? (
                  <span className="tabular-nums">
                    {day(resolved.availableFrom)}
                  </span>
                ) : (
                  <span className="text-neutral-500">Not set</span>
                )
              }
            />
            <SummaryRow
              label="Last day to start"
              value={
                resolved.dueDate ? (
                  <span className="tabular-nums">{day(resolved.dueDate)}</span>
                ) : (
                  <span className="text-neutral-500">Not set</span>
                )
              }
            />
            <SummaryRow
              label="Attempts"
              value={
                <span className="inline-flex items-center gap-2">
                  <span className="tabular-nums">
                    {resolved.attemptsOverride ?? resolved.examMaxAttempts}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {resolved.attemptsOverride === null
                      ? "exam default"
                      : "override"}
                  </span>
                </span>
              }
              span2
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
                student{resolved.newStudents.length === 1 ? "" : "s"} will
                receive this exam.
              </p>

              {resolved.skippedCount > 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  <span className="tabular-nums">{resolved.skippedCount}</span>{" "}
                  already {resolved.skippedCount === 1 ? "has" : "have"} it and
                  will be skipped.
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
                {resolved.newStudents.slice(0, 25).map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/[0.03]"
                  >
                    {name(s)}
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
              action={createExamAssignments}
              className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6"
            >
              <input type="hidden" name="examId" value={parsed.data.examId} />
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
                name="availableFrom"
                value={parsed.data.availableFrom}
              />
              <input
                type="hidden"
                name="dueDate"
                value={parsed.data.dueDate}
              />
              <input
                type="hidden"
                name="attemptsOverride"
                value={parsed.data.attemptsOverride}
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
                    I understand this assigns the exam to{" "}
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

function InfoIcon() {
  return (
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
  );
}

function SummaryRow({
  label,
  value,
  span2,
}: {
  label: string;
  value: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 ${
        span2 ? "sm:col-span-2" : ""
      }`}
    >
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </dt>
      <dd className="text-right text-sm text-neutral-200">{value}</dd>
    </div>
  );
}