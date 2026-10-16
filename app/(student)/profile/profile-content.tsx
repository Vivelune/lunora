import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { loadStudentProgress } from "@/lib/progress";
import {
  examProgressState,
  planOverdue,
  planState,
  plansBySubject,
  summarizeExams,
  summarizePlans,
} from "@/lib/progress-core";
import { formatHundredths } from "@/lib/points";
import { GRADE_LABELS, GRADE_VALUES } from "@/lib/validation/profile";
import { updateProfile } from "./actions";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");
const stamp = (d: Date) =>
  d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

const EXAM_TEXT = {
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  MISSED: "Missed (deadline passed)",
  UPCOMING: "Coming up",
  NOT_STARTED: "Not started",
} as const;

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function ProfileContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { profile } = await requireCompletedProfile();
  const { error, saved } = await searchParams;

  const now = new Date();
  const { plans, exams, activity } = await loadStudentProgress(profile.id);
  const planSummary = summarizePlans(plans, now);
  const subjects = plansBySubject(plans, now);
  const examSummary = summarizeExams(exams, now);

  const outstandingPlans = plans
    .filter((p) => planState(p) !== "COMPLETED")
    .sort(
      (a, b) =>
        Number(planOverdue(b, now)) - Number(planOverdue(a, now)) ||
        (a.dueDate?.getTime() ?? Infinity) -
          (b.dueDate?.getTime() ?? Infinity)
    );
  const outstandingExams = exams.filter(
    (e) => examProgressState(e, now) !== "COMPLETED"
  );

  const completion = planSummary.completionHundredths;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Account
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          My profile
        </h1>

        <p className="mt-3 text-sm text-neutral-400">
          {profile.firstName
            ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}`
            : "Manage your details and learning progress."}
        </p>
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

      {/* ============ YOUR DETAILS ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Your details" />
          <p className="mt-2 text-sm text-neutral-500">
            Update your name, phone number, and grade level.
          </p>
        </div>

        <form action={updateProfile} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelBase}>
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                required
                maxLength={50}
                defaultValue={profile.firstName ?? ""}
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelBase}>
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                required
                maxLength={50}
                defaultValue={profile.lastName ?? ""}
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelBase}>
                Phone number
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  with country code
                </span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                defaultValue={profile.phone ?? ""}
                placeholder="+14155552671"
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor="gradeLevel" className={labelBase}>
                Grade level
              </label>
              <select
                id="gradeLevel"
                name="gradeLevel"
                required
                defaultValue={profile.gradeLevel ?? ""}
                className={inputBase}
              >
                {GRADE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {GRADE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
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
            Your account role and sign-in details can&apos;t be changed here.
            Member since{" "}
            <span className="tabular-nums text-neutral-400">
              {day(profile.createdAt)}
            </span>
            .
          </span>
        </p>
      </section>

      {/* ============ LEARNING PROGRESS ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Learning progress" />
          <p className="mt-2 text-sm text-neutral-500">
            How much of your work you have{" "}
            <strong className="font-medium text-neutral-400">done</strong>.
            Your scores are on the{" "}
            <Link
              href="/performance"
              className="font-medium text-violet-300 underline-offset-2 transition-colors hover:text-violet-200 hover:underline"
            >
              performance page
            </Link>
            .
          </p>
        </div>

        {plans.length === 0 && exams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-neutral-400">
              Nothing is assigned to you yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Progress will appear here once your tutor adds work.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Summary grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ProgressCard
                label="Lesson plan completion"
                value={
                  completion === null
                    ? "—"
                    : `${formatHundredths(completion)}%`
                }
                hint={`${planSummary.requiredDone} of ${planSummary.requiredTotal} required lessons`}
                tone="violet"
              />
              <ProgressCard
                label="Lesson plans"
                value={`${planSummary.completed} of ${planSummary.total}`}
                hint={`${planSummary.inProgress} in progress, ${planSummary.notStarted} not started`}
                tone="indigo"
              />
              <ProgressCard
                label="Lessons completed"
                value={String(planSummary.lessonsCompleted)}
                hint="different lessons"
                tone="emerald"
              />
              <ProgressCard
                label="Assigned exams taken"
                value={`${examSummary.completed} of ${examSummary.total}`}
                hint={`${examSummary.inProgress} in progress, ${examSummary.missed} missed`}
                tone="neutral"
              />
            </div>

            {/* Overdue alert */}
            {planSummary.overdue + examSummary.missed > 0 && (
              <div
                role="status"
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
                <span>
                  {planSummary.overdue > 0 && (
                    <>
                      {planSummary.overdue} lesson plan
                      {planSummary.overdue === 1 ? " is" : "s are"} overdue.{" "}
                    </>
                  )}
                  {examSummary.missed > 0 && (
                    <>
                      {examSummary.missed} exam deadline
                      {examSummary.missed === 1 ? " was" : "s were"} missed.
                    </>
                  )}
                </span>
              </div>
            )}

            {/* By subject */}
            {subjects.length > 0 && (
              <div>
                <div className="mb-3 mt-2">
                  <SectionHeader
                    dot="from-emerald-400 to-teal-400"
                    label="By subject"
                  />
                </div>
                <ul className="flex flex-col gap-2">
                  {subjects.map((s) => (
                    <li
                      key={s.subjectId}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3.5"
                    >
                      <span className="text-sm font-medium text-white">
                        {s.subjectName}
                      </span>
                      <span className="flex items-baseline gap-2 text-sm">
                        <span className="font-semibold tabular-nums text-neutral-200">
                          {s.summary.completionHundredths === null
                            ? "—"
                            : `${formatHundredths(
                                s.summary.completionHundredths
                              )}%`}
                        </span>
                        <span className="text-xs tabular-nums text-neutral-500">
                          {s.summary.completed} of {s.summary.total} plans
                          completed
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ============ OUTSTANDING WORK ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-amber-400 to-orange-400" label="Outstanding work" />
          <p className="mt-2 text-sm text-neutral-500">
            {outstandingPlans.length + outstandingExams.length === 0
              ? "You are all caught up."
              : `${outstandingPlans.length + outstandingExams.length} item${
                  outstandingPlans.length + outstandingExams.length === 1
                    ? ""
                    : "s"
                } still to work on.`}
          </p>
        </div>

        {outstandingPlans.length === 0 && outstandingExams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-neutral-400">You are all caught up.</p>
            <p className="mt-1 text-xs text-neutral-500">
              New assignments will appear here when your tutor adds them.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {outstandingPlans.map((p) => {
              const overdue = planOverdue(p, now);
              return (
                <li key={p.assignmentId}>
                  <Link
                    href={`/plans/${p.assignmentId}`}
                    className={`group flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3.5 transition-colors ${
                      overdue
                        ? "border-rose-400/20 bg-rose-500/[0.04] hover:border-rose-400/30"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {p.planTitle}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-neutral-500">
                        Lesson plan · {p.requiredDone} of {p.requiredTotal}{" "}
                        required lessons
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-4">
                      <span
                        className={`text-xs tabular-nums ${
                          overdue ? "text-rose-300" : "text-neutral-500"
                        }`}
                      >
                        {overdue ? "Overdue, was due " : "Due "}
                        {day(p.dueDate)}
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

            {outstandingExams.map((e) => {
              const state = examProgressState(e, now);
              const missed = state === "MISSED";
              return (
                <li key={e.assignmentId}>
                  <Link
                    href="/exams"
                    className={`group flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3.5 transition-colors ${
                      missed
                        ? "border-rose-400/20 bg-rose-500/[0.04] hover:border-rose-400/30"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {e.examTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">Exam</p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-4">
                      <span
                        className={`text-xs tabular-nums ${
                          missed ? "text-rose-300" : "text-neutral-500"
                        }`}
                      >
                        {EXAM_TEXT[state]}
                        {e.closesAt && !missed && (
                          <> · start by {day(e.closesAt)}</>
                        )}
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
        )}
      </section>

      {/* ============ RECENT ACTIVITY ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-neutral-400 to-neutral-600" label="Recent learning activity" />
          <p className="mt-2 text-sm text-neutral-500">
            {activity.length === 0
              ? "No activity yet."
              : `Your last ${activity.length} activity item${
                  activity.length === 1 ? "" : "s"
                }, newest first.`}
          </p>
        </div>

        {activity.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-neutral-400">No activity yet.</p>
            <p className="mt-1 text-xs text-neutral-500">
              Your progress will show up here as you work through lessons and
              exams.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((a, i) => {
              const isLesson = a.kind === "LESSON";
              return (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        isLesson
                          ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-300"
                          : "border-violet-400/30 bg-violet-500/10 text-violet-300"
                      }`}
                    >
                      {isLesson ? "Lesson" : "Exam"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {a.detail}
                      </p>
                    </div>
                  </div>

                  <span className="flex-shrink-0 text-xs tabular-nums text-neutral-500">
                    {stamp(a.at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   SectionHeader
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

/* ============================================================
   ProgressCard
   ============================================================ */
function ProgressCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "violet" | "indigo" | "emerald" | "neutral";
}) {
  const accents: Record<typeof tone, string> = {
    violet: "from-violet-400 to-fuchsia-400",
    indigo: "from-indigo-400 to-sky-400",
    emerald: "from-emerald-400 to-teal-400",
    neutral: "from-neutral-500 to-neutral-600",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
      <div
        aria-hidden
        className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${accents[tone]} opacity-20 blur-2xl`}
      />

      <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </p>

      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{hint}</p>
    </div>
  );
}