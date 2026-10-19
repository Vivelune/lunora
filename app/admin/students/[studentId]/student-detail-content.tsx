import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreTrendChart } from "@/components/charts/score-trend-chart";
import { requireAdmin } from "@/lib/auth";
import { loadAttemptFacts, loadTopicAnswers } from "@/lib/analytics";
import {
  bestPerExam,
  bySubject,
  summarize,
  topicStats,
  trendPoints,
} from "@/lib/analytics-core";
import { buildTrend } from "@/lib/chart-data";
import { formatHundredths } from "@/lib/points";
import prisma from "@/lib/prisma";
import { loadStudentProgress } from "@/lib/progress";
import {
  examProgressState,
  planOverdue,
  planState,
  summarizeExams,
  summarizePlans,
} from "@/lib/progress-core";
import { GRADE_LABELS } from "@/lib/validation/profile";
import { PerformanceMetrics } from "@/app/components/performance-metrics";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");
const stamp = (d: Date) =>
  d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

const PLAN_TEXT = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
} as const;

const EXAM_TEXT = {
  IN_PROGRESS: "In progress",
  COMPLETED: "Taken",
  MISSED: "Missed (deadline passed)",
  UPCOMING: "Coming up",
  NOT_STARTED: "Not started",
} as const;

export default async function StudentDetailContent({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireAdmin();
  const { studentId } = await params;

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentId, role: "STUDENT" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      gradeLevel: true,
      onboardingCompletedAt: true,
      createdAt: true,
      groupMemberships: {
        select: { group: { select: { id: true, name: true } } },
      },
    },
  });

  if (!student) {
    notFound();
  }

  const now = new Date();
  const [progress, facts, attempts] = await Promise.all([
    loadStudentProgress(student.id),
    // Admin view: every graded attempt, released to the student or not.
    loadAttemptFacts({ studentId: student.id, releasedOnly: false }),
    prisma.examAttempt.findMany({
      where: { studentId: student.id },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        endReason: true,
        flaggedForReview: true,
        pointsEarned: true,
        pointsPossible: true,
        percentage: true,
        assignmentId: true,
        exam: { select: { title: true } },
      },
    }),
  ]);

  const planSummary = summarizePlans(progress.plans, now);
  const examSummary = summarizeExams(progress.exams, now);
  const overall = summarize(facts);
  const subjects = bySubject(facts);
  const bestIds = new Set(bestPerExam(facts).map((f) => f.attemptId));
  const topics = topicStats(await loadTopicAnswers([...bestIds]), bestIds);
  const { rows: trendRows, series: trendSeries } = buildTrend(
    trendPoints(facts),
    subjects
  );

  const overdueTotal = planSummary.overdue + examSummary.missed;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Student
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {student.lastName}, {student.firstName}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {student.gradeLevel
              ? GRADE_LABELS[
                  student.gradeLevel as keyof typeof GRADE_LABELS
                ] ?? student.gradeLevel
              : "No grade"}
          </span>

          {student.onboardingCompletedAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Profile complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
              Profile incomplete
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            Member since{" "}
            <span className="tabular-nums text-neutral-300">
              {day(student.createdAt)}
            </span>
          </span>

          {overdueTotal > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              {overdueTotal} overdue
            </span>
          )}
        </div>
      </header>

      {/* ============ CONTACT & GROUPS ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Details" />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <InfoRow
            label="Phone"
            value={
              student.phone ? (
                <span className="tabular-nums">{student.phone}</span>
              ) : (
                <span className="text-neutral-500">Not provided</span>
              )
            }
            hint="Visible to admins only"
          />

          <InfoRow
            label="Groups"
            value={
              student.groupMemberships.length === 0 ? (
                <span className="text-neutral-500">None</span>
              ) : (
                <span className="flex flex-wrap gap-1.5">
                  {student.groupMemberships.map((m) => (
                    <Link
                      key={m.group.id}
                      href={`/admin/groups/${m.group.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      {m.group.name}
                    </Link>
                  ))}
                </span>
              )
            }
          />
        </dl>
      </section>

      {/* ============ PERFORMANCE ============ */}
      <section>
        <div className="mb-5">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Performance" />
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Admin view: includes every graded attempt, even ones whose results
            the student cannot see yet. Average is points-weighted over each
            exam&apos;s best attempt.
          </p>
        </div>

        {facts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-neutral-400">
              No graded attempts yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Performance will appear here after the student takes a graded
              exam.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <PerformanceMetrics summary={overall} />
            <ScoreTrendChart rows={trendRows} series={trendSeries} />

            {/* Per-subject breakdown */}
            {subjects.map((s) => {
              const subjectTopics = topics.filter(
                (t) => t.subjectId === s.subjectId
              );

              return (
                <div key={s.subjectId} className="flex flex-col gap-4">
                  <div className="mt-2">
                    <SectionHeader
                      dot="from-emerald-400 to-teal-400"
                      label={s.subjectName}
                    />
                  </div>

                  <PerformanceMetrics summary={s.summary} />

                  {subjectTopics.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {subjectTopics.map((t) => (
                        <li
                          key={t.categoryId}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">
                              {t.name}
                            </p>
                            <p className="mt-0.5 text-xs tabular-nums text-neutral-500">
                              {t.questions} question
                              {t.questions === 1 ? "" : "s"}
                            </p>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-3">
                            <span className="text-base font-semibold tabular-nums text-white">
                              {formatHundredths(t.percentHundredths)}%
                            </span>
                            <TopicPill label={t.label} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ LEARNING PROGRESS ============ */}
      <section>
        <div className="mb-5">
          <SectionHeader dot="from-sky-400 to-indigo-400" label="Learning progress" />
          <p className="mt-2 text-sm text-neutral-500">
            Assigned work — how much has been completed.
          </p>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProgressCard
            label="Plan completion"
            value={
              planSummary.completionHundredths === null
                ? "—"
                : `${formatHundredths(planSummary.completionHundredths)}%`
            }
            hint={`${planSummary.requiredDone} of ${planSummary.requiredTotal} required lessons`}
            tone="violet"
          />

          <ProgressCard
            label="Plans completed"
            value={`${planSummary.completed} of ${planSummary.total}`}
            hint={
              planSummary.total === 0
                ? "No plans assigned"
                : `${planSummary.inProgress} in progress`
            }
            tone="indigo"
          />

          <ProgressCard
            label="Lessons completed"
            value={String(planSummary.lessonsCompleted)}
            hint="different lessons across all plans"
            tone="emerald"
          />

          <ProgressCard
            label="Overdue or missed"
            value={String(overdueTotal)}
            hint={
              overdueTotal > 0
                ? `${planSummary.overdue} plans, ${examSummary.missed} exams`
                : "All caught up"
            }
            tone={overdueTotal > 0 ? "rose" : "neutral"}
          />
        </div>

        {/* Plans list */}
        <div className="mb-6">
          <div className="mb-3">
            <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Lesson plans" />
          </div>

          {progress.plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-neutral-400">
                No lesson plans assigned.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {progress.plans.map((p) => {
                const overdue = planOverdue(p, now);
                return (
                  <li key={p.assignmentId}>
                    <Link
                      href={`/admin/assignments/${p.assignmentId}`}
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
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {p.subjectName} ·{" "}
                          <span className="tabular-nums">
                            {p.requiredDone} of {p.requiredTotal}
                          </span>{" "}
                          required
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-3">
                        {overdue && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
                            <span className="h-1 w-1 rounded-full bg-rose-400" />
                            Overdue
                          </span>
                        )}
                        <PlanStatePill state={planState(p)} />
                        {p.dueDate && (
                          <span
                            className={`text-xs tabular-nums ${
                              overdue ? "text-rose-300" : "text-neutral-500"
                            }`}
                          >
                            Due {day(p.dueDate)}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Exams list */}
        <div>
          <div className="mb-3">
            <SectionHeader dot="from-emerald-400 to-teal-400" label="Assigned exams" />
          </div>

          {progress.exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-neutral-400">No exams assigned.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {progress.exams.map((e) => {
                const state = examProgressState(e, now);
                const missed = state === "MISSED";
                return (
                  <li key={e.assignmentId}>
                    <Link
                      href={`/admin/exam-assignments/${e.assignmentId}`}
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
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {e.subjectName}
                          {e.endedAttempts > 0 && (
                            <>
                              {" · "}
                              <span className="tabular-nums">
                                {e.endedAttempts} attempt
                                {e.endedAttempts === 1 ? "" : "s"}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-3">
                        <ExamStatePill state={state} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ============ EXAM HISTORY ============ */}
      <section>
        <div className="mb-5">
          <SectionHeader dot="from-amber-400 to-orange-400" label="Exam history" />
          <p className="mt-2 text-sm text-neutral-500">
            {attempts.length === 0
              ? "No exam attempts yet."
              : `${attempts.length} attempt${attempts.length === 1 ? "" : "s"}, newest first.`}
          </p>
        </div>

        {attempts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-neutral-400">
              No exam attempts yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Attempts will appear here when the student takes an exam.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                      Exam
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                      #
                    </th>
                    <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 sm:table-cell">
                      Type
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                      Status
                    </th>
                    <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:table-cell">
                      Ended
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                      Score
                    </th>
                    <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 sm:table-cell">
                      Review
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr
                      key={a.id}
                      className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* Exam */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/attempts/${a.id}`}
                          className="group/link inline-flex items-center gap-2 font-medium text-white transition-colors hover:text-violet-200"
                        >
                          <span className="truncate">{a.exam.title}</span>
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

                      {/* Attempt number */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                          #{a.attemptNumber}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="hidden px-5 py-4 sm:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                            a.assignmentId
                              ? "border-violet-400/30 bg-violet-500/10 text-violet-300"
                              : "border-white/10 bg-white/[0.03] text-neutral-400"
                          }`}
                        >
                          {a.assignmentId ? "Assigned" : "Practice"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <AttemptStatusPill
                          status={a.status}
                          endReason={a.endReason}
                        />
                      </td>

                      {/* Ended */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        {a.submittedAt ? (
                          <span className="tabular-nums text-neutral-400">
                            {stamp(a.submittedAt)}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="px-5 py-4">
                        {a.pointsEarned !== null &&
                        a.pointsPossible !== null ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold tabular-nums text-white">
                              {a.percentage?.toString()}%
                            </span>
                            <span className="text-xs tabular-nums text-neutral-500">
                              {a.pointsEarned.toString()} of{" "}
                              {a.pointsPossible.toString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Review */}
                      <td className="hidden px-5 py-4 sm:table-cell">
                        {a.flaggedForReview ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
                            <span className="h-1 w-1 rounded-full bg-rose-400" />
                            Flagged
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/students"
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
        Back to students
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
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </dt>
      <dd className="text-sm text-neutral-200">{value}</dd>
      {hint && <p className="text-[10px] text-neutral-600">{hint}</p>}
    </div>
  );
}

function ProgressCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "violet" | "indigo" | "emerald" | "rose" | "neutral";
}) {
  const accents: Record<typeof tone, string> = {
    violet: "from-violet-400 to-fuchsia-400",
    indigo: "from-indigo-400 to-sky-400",
    emerald: "from-emerald-400 to-teal-400",
    rose: "from-rose-400 to-fuchsia-400",
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

function PlanStatePill({
  state,
}: {
  state: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}) {
  if (state === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Completed
      </span>
    );
  }
  if (state === "IN_PROGRESS") {
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

function ExamStatePill({ state }: { state: string }) {
  if (state === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Taken
      </span>
    );
  }
  if (state === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        In progress
      </span>
    );
  }
  if (state === "MISSED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Missed
      </span>
    );
  }
  if (state === "UPCOMING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
        Coming up
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

function TopicPill({ label }: { label: string }) {
  if (label === "STRONG") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Strong
      </span>
    );
  }
  if (label === "NEEDS_ATTENTION") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Needs attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Developing
    </span>
  );
}

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