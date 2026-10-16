import Link from "next/link";

import { requireCompletedProfile } from "@/lib/auth";
import { getStudentAssignments } from "@/lib/plan-progress";
import { getStudentExams } from "@/lib/student-exams";
import { getStudentResultsList } from "@/lib/student-results";
import prisma from "@/lib/prisma";
import { GRADE_LABELS } from "@/lib/validation/profile";

import { PlanCard } from "../plans/plan-card";

export default async function DashboardContent() {
  const { profile } = await requireCompletedProfile();

  const grade =
    GRADE_LABELS[
      profile.gradeLevel as keyof typeof GRADE_LABELS
    ] ?? profile.gradeLevel;

  const [subjects, assignments, exams, results] = await Promise.all([
    prisma.subject.findMany({
      where: {
        isActive: true,
        children: {
          none: {
            isActive: true,
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        parent: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            categories: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    }),

    getStudentAssignments(profile.id),
    getStudentExams(profile.id),
    getStudentResultsList(profile.id, 10),
  ]);

  const examsOpen = exams.assigned.filter(
    (e) => e.state === "AVAILABLE",
  ).length;

  const nextExam = exams.assigned.find(
    (e) => e.state === "AVAILABLE",
  );
  const resumeExam = [...exams.assigned, ...exams.practice].find(
    (e) => e.inProgressAttemptId !== null
  );

  const recentResults = results
    .filter((r) => r.released && r.percentage !== null)
    .slice(0, 3);

  // Separate unfinished plans from completed plans.
  const active = assignments.filter((a) => !a.completedAt);
  const completed = assignments.filter((a) => a.completedAt);

  // Find the first active plan that the student can start or continue.
  const resumable = active.find((a) => !a.startsInFuture);

  const overdueCount = active.filter((a) => a.isOverdue).length;

  // Count active plans for each subject.
  const assignedBySubject = new Map<string, number>();

  for (const assignment of active) {
    assignedBySubject.set(
      assignment.subjectId,
      (assignedBySubject.get(assignment.subjectId) ?? 0) + 1,
    );
  }

  return (
    <main className="relative min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-15%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/[0.07] blur-[140px]" />
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
        {/* ============ HEADER ============ */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              Dashboard
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                {profile.firstName ?? "student"}
              </span>
            </h1>

            <p className="mt-2 text-sm text-neutral-400">{grade}</p>
          </div>

          {resumable && (
            <Link
              href={`/plans/${resumable.id}`}
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
            >
              <span>
                {resumable.doneItems > 0 ? "Continue" : "Start"}
              </span>

              <span className="hidden max-w-[180px] truncate opacity-90 sm:inline">
                {resumable.planTitle}
              </span>

              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              >
                <path
                  d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
        </header>

        {/* ============ STATS ============ */}
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Current plans"
            value={active.length}
            accent="indigo"
          />

          <StatCard
            label="Overdue"
            value={overdueCount}
            accent={overdueCount > 0 ? "rose" : "neutral"}
            hint={overdueCount > 0 ? "Needs attention" : "All caught up"}
          />

          <StatCard
            label="Completed"
            value={completed.length}
            accent="emerald"
          />
        </section>

        {/* ============ ASSIGNED WORK ============ */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Assigned work
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                {active.length === 0
                  ? "You're all clear for now."
                  : `${active.length} active plan${
                      active.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>

            <Link
              href="/plans"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
            >
              View all
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
          </div>

          {active.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-neutral-400">
                Nothing is assigned to you right now.
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                New work will appear here when your teacher adds it.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {active.slice(0, 4).map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="rounded-[calc(1rem-2px)] bg-neutral-950/40 p-4">
                    <PlanCard plan={assignment} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ============ EXAMS ============ */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Exams
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                {examsOpen === 0
                  ? "Nothing open right now."
                  : `${examsOpen} exam${examsOpen === 1 ? "" : "s"} open for you`}
              </p>
            </div>

            <Link
              href="/exams"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
            >
              View all exams
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
          </div>

          {resumeExam?.inProgressAttemptId && (
            <div className="relative mb-5 overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-5 backdrop-blur">
              <span
                aria-hidden
                className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 opacity-20 blur-2xl"
              />

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-amber-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                    </span>
                    Exam in progress
                  </p>

                  <h3 className="mt-2 text-base font-semibold tracking-tight text-white">
                    {resumeExam.title}
                  </h3>

                  {resumeExam.subject && (
                    <p className="mt-1 text-xs text-neutral-400">
                      {resumeExam.subject}
                    </p>
                  )}
                </div>

                <Link
                  href={`/attempts/${resumeExam.inProgressAttemptId}`}
                  className="group inline-flex h-10 items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/[0.18]"
                >
                  Resume exam
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
                </Link>
              </div>

              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-amber-200/80">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
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
                Your timer is running. Resume as soon as you can.
              </p>
            </div>
          )}

          {examsOpen === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-neutral-400">
                No exams are open for you right now.
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                When your tutor assigns an exam that&apos;s open, it will
                appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {nextExam && (
                <article className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-5 backdrop-blur transition-colors hover:border-emerald-400/30 hover:bg-emerald-500/[0.06]">
                  <span
                    aria-hidden
                    className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 opacity-20 blur-2xl"
                  />

                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
                        Next up
                      </p>
                      <h3 className="mt-1.5 text-base font-semibold tracking-tight text-white">
                        {nextExam.title}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-400">
                        {nextExam.subject}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Available
                    </span>
                  </div>

                  {nextExam.closesAt && (
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-300">
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-500"
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
                        Start by{" "}
                        <span className="tabular-nums text-neutral-200">
                          {nextExam.closesAt.toISOString().slice(0, 10)}
                        </span>{" "}
                        UTC.
                      </span>
                    </p>
                  )}

                  <Link
                    href="/exams"
                    className="group/btn mt-auto inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-white/[0.06] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
                  >
                    View exams
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5"
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
                </article>
              )}

              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
                    Open exams
                  </p>

                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white tabular-nums">
                    {examsOpen}
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    {examsOpen === 1
                      ? "One exam is ready to start."
                      : `${examsOpen} exams are ready to start.`}
                  </p>
                </div>

                <Link
                  href="/exams"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
                >
                  View all
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
              </div>
            </div>
          )}
        </section>

        {/* ============ RECENTLY GRADED EXAMS ============ */}
        {recentResults.length > 0 && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Recently graded exams
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Your latest released scores.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/performance"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
                >
                  My performance
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

                <Link
                  href="/results"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
                >
                  All my results
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
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {recentResults.map((r) => (
                <li key={r.attemptId}>
                  <Link
                    href={`/attempts/${r.attemptId}/results`}
                    className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {r.examTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Attempt{" "}
                        <span className="tabular-nums">{r.attemptNumber}</span>
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold tracking-tight text-white tabular-nums">
                          {r.percentage}
                          <span className="text-xs text-neutral-500">%</span>
                        </p>
                        <p className="text-[11px] tabular-nums text-neutral-500">
                          {r.pointsEarned} of {r.pointsPossible}
                          {r.passed === true && (
                            <span className="ml-1.5 text-emerald-400">
                              · Passed
                            </span>
                          )}
                          {r.passed === false && (
                            <span className="ml-1.5 text-rose-400">
                              · Not passed
                            </span>
                          )}
                        </p>
                      </div>

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
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ============ SUBJECTS ============ */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Your subjects
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {subjects.length === 0
                ? "No subjects available yet."
                : `${subjects.length} subject${
                    subjects.length === 1 ? "" : "s"
                  } available`}
            </p>
          </div>

          {subjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-neutral-400">
                No subjects are available yet.
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                They&apos;ll show up here once they&apos;re published.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => {
                const assigned = assignedBySubject.get(subject.id) ?? 0;

                return (
                  <article
                    key={subject.id}
                    className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 opacity-70" />

                    <h3 className="text-base font-semibold tracking-tight text-white">
                      {subject.parent
                        ? `${subject.parent.name} ${subject.name}`
                        : subject.name}
                    </h3>

                    {subject.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-400">
                        {subject.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-neutral-400">
                        {subject._count.categories} topics
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                          assigned > 0
                            ? "border border-violet-400/30 bg-violet-500/10 text-violet-200"
                            : "border border-white/10 bg-white/[0.03] text-neutral-500"
                        }`}
                      >
                        {assigned > 0
                          ? `${assigned} assigned`
                          : "Not assigned"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   StatCard — small internal component, no logic dependencies
   ============================================================ */

function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number;
  accent: "indigo" | "rose" | "emerald" | "neutral";
  hint?: string;
}) {
  const accents: Record<typeof accent, string> = {
    indigo: "from-indigo-400 to-violet-400",
    rose: "from-rose-400 to-fuchsia-400",
    emerald: "from-emerald-400 to-teal-400",
    neutral: "from-neutral-500 to-neutral-600",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
      <div
        aria-hidden
        className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${accents[accent]} opacity-20 blur-2xl`}
      />

      <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </p>

      {hint && (
        <p className="mt-1 text-xs text-neutral-500">{hint}</p>
      )}
    </div>
  );
}