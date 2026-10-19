import Link from "next/link";
import { parseDay } from "@/lib/assignments";
import { percentHundredths } from "@/lib/analytics-core";
import { requireAdmin } from "@/lib/auth";
import { formatHundredths, toHundredths } from "@/lib/points";
import prisma from "@/lib/prisma";
import { GRADE_LABELS, GRADE_VALUES } from "@/lib/validation/profile";

const PAGE_SIZE = 50;
const stamp = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace("T", " ") : "—");
const subjectLabel = (s: { name: string; parent: { name: string } | null }) =>
  s.parent ? `${s.parent.name} ${s.name}` : s.name;

const STATUS_LABEL: Record<string, string> = {
  GRADED: "Graded",
  SUBMITTED: "Submitted",
  EXPIRED: "Expired",
  IN_PROGRESS: "In progress",
};

export default async function ExamResultsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const { q, grade, subject, category, examId, kind, from: fromRaw, to: toRaw, page } = sp;
  const statusValue = sp.status ?? "GRADED";

  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const terms = (q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
  const gradeFilter = (GRADE_VALUES as readonly string[]).includes(grade ?? "") ? grade : undefined;

  const from = parseDay(fromRaw ?? "", false);
  const to = parseDay(toRaw ?? "", true);
  const dateError = !from.ok || !to.ok ? "One of the dates is not valid, so the date range was ignored." : null;
  const submittedAt = {
    ...(from.ok && from.date ? { gte: from.date } : {}),
    ...(to.ok && to.date ? { lte: to.date } : {}),
  };

  const statusWhere =
    statusValue === "ALL"
      ? {}
      : statusValue === "AWAITING"
        ? { status: { in: ["SUBMITTED", "EXPIRED"] as ("SUBMITTED" | "EXPIRED")[] } }
        : statusValue === "IN_PROGRESS"
          ? { status: "IN_PROGRESS" as const }
          : { status: "GRADED" as const };

  const where = {
    ...statusWhere,
    ...(Object.keys(submittedAt).length > 0 && !dateError ? { submittedAt } : {}),
    ...(examId ? { examId } : {}),
    ...(kind === "assigned" ? { assignmentId: { not: null } } : kind === "practice" ? { assignmentId: null } : {}),
    exam: {
      ...(subject ? { subjectId: subject } : {}),
      ...(category ? { categoryId: category } : {}),
    },
    student: {
      ...(gradeFilter ? { gradeLevel: gradeFilter } : {}),
      ...(terms.length > 0
        ? {
            AND: terms.map((term) => ({
              OR: [
                { firstName: { contains: term, mode: "insensitive" as const } },
                { lastName: { contains: term, mode: "insensitive" as const } },
              ],
            })),
          }
        : {}),
    },
  };

  const gradedWhere = { AND: [where, { status: "GRADED" as const, pointsPossible: { gt: 0 } }] };

  const [total, rows, sums, studentGroups, passedCount, failedCount, exams, subjects, categories] = await Promise.all([
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
        submittedAt: true,
        startedAt: true,
        assignmentId: true,
        flaggedForReview: true,
        pointsEarned: true,
        pointsPossible: true,
        percentage: true,
        passed: true,
        student: { select: { id: true, firstName: true, lastName: true, gradeLevel: true } },
        exam: { select: { title: true, subject: { select: { name: true, parent: { select: { name: true } } } } } },
      },
    }),
    prisma.examAttempt.aggregate({ where: gradedWhere, _sum: { pointsEarned: true, pointsPossible: true }, _count: { _all: true } }),
    prisma.examAttempt.groupBy({ by: ["studentId"], where }),
    prisma.examAttempt.count({ where: { AND: [where, { status: "GRADED", passed: true }] } }),
    prisma.examAttempt.count({ where: { AND: [where, { status: "GRADED", passed: false }] } }),
    prisma.exam.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.subject.findMany({
      where: { isActive: true, children: { none: {} } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, parent: { select: { name: true } } },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ subject: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true, subject: { select: { name: true, parent: { select: { name: true } } } } },
    }),
  ]);

  const earned = sums._sum.pointsEarned ? toHundredths(sums._sum.pointsEarned.toString()) : 0;
  const possible = sums._sum.pointsPossible ? toHundredths(sums._sum.pointsPossible.toString()) : 0;
  const average = possible > 0 ? percentHundredths(earned, possible) : null;
  const withMark = passedCount + failedCount;

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) if (value && key !== "page") params.set(key, value);
    params.set("page", String(p));
    return `/admin/reports/exam-results?${params.toString()}`;
  };

  const hasFilters = Boolean(q || grade || subject || category || examId || kind || fromRaw || toRaw || statusValue !== "GRADED");

  const field = "flex flex-col gap-1.5";
  const labelCls = "text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500";
  const control =
    "h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus-visible:border-white/25 focus-visible:ring-2 focus-visible:ring-white/10";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <Link
          href="/admin/reports"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All reports
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Reports
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Exam results
          </h1>
          {total > 0 && (
            <p className="text-sm text-neutral-400">
              <span className="font-medium text-white tabular-nums">{total.toLocaleString()}</span>{" "}
              {total === 1 ? "attempt" : "attempts"} match
            </p>
          )}
        </div>
        <p className="mt-3 text-sm text-neutral-400">
          Every attempt, across all students — including results students cannot see yet.
        </p>
      </header>

      {/* ============ FILTERS ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Filters" />
        </div>

        <form
          method="get"
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
          aria-label="Filter exam results"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`${field} lg:col-span-2`}>
              <label htmlFor="q" className={labelCls}>Student name</label>
              <div className="relative">
                <svg aria-hidden viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500">
                  <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.4" />
                  <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  id="q"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Search by first or last name"
                  className={`${control} pl-8`}
                />
              </div>
            </div>
            <div className={field}>
              <label htmlFor="grade" className={labelCls}>Grade</label>
              <select id="grade" name="grade" defaultValue={gradeFilter ?? ""} className={control}>
                <option value="">All grades</option>
                {GRADE_VALUES.map((g) => (
                  <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="status" className={labelCls}>Attempt status</label>
              <select id="status" name="status" defaultValue={statusValue} className={control}>
                <option value="GRADED">Graded</option>
                <option value="AWAITING">Ended, not graded yet</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="ALL">All</option>
              </select>
            </div>
            <div className={field}>
              <label htmlFor="subject" className={labelCls}>Subject</label>
              <select id="subject" name="subject" defaultValue={subject ?? ""} className={control}>
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{subjectLabel(s)}</option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="category" className={labelCls}>Category</label>
              <select id="category" name="category" defaultValue={category ?? ""} className={control}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{subjectLabel(c.subject)}: {c.name}</option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="examId" className={labelCls}>Exam</label>
              <select id="examId" name="examId" defaultValue={examId ?? ""} className={control}>
                <option value="">All exams</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="kind" className={labelCls}>Assigned or practice</label>
              <select id="kind" name="kind" defaultValue={kind ?? ""} className={control}>
                <option value="">Both</option>
                <option value="assigned">Assigned</option>
                <option value="practice">Practice</option>
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <div className={`${field} flex-1`}>
                <label htmlFor="from" className={labelCls}>Ended from</label>
                <input id="from" name="from" type="date" defaultValue={fromRaw ?? ""} className={control} />
              </div>
              <div className={`${field} flex-1`}>
                <label htmlFor="to" className={labelCls}>to</label>
                <input id="to" name="to" type="date" defaultValue={toRaw ?? ""} className={control} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
            <button
              type="submit"
              className="h-9 rounded-md bg-white px-4 text-sm font-medium text-neutral-950 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Apply filters
            </button>
            {hasFilters && (
              <Link
                href="/admin/reports/exam-results"
                className="text-sm text-neutral-400 underline-offset-4 transition-colors hover:text-neutral-200 hover:underline"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </section>

      {dateError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200"
        >
          <WarningIcon />
          <p>{dateError}</p>
        </div>
      )}

      {/* ============ OVERVIEW ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Overview" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Attempts in report"
            value={total.toLocaleString()}
            tone="indigo"
          />
          <StatCard
            label="Students"
            value={studentGroups.length.toLocaleString()}
            tone="violet"
          />
          <StatCard
            label="Average (points-weighted)"
            value={average === null ? "—" : `${formatHundredths(average)}%`}
            hint={
              sums._count._all > 0
                ? `Across ${sums._count._all} graded attempts · ${formatHundredths(earned)} / ${formatHundredths(possible)} pts`
                : "No graded attempts in this filter"
            }
            tone="sky"
          />
          <StatCard
            label="Pass rate"
            value={withMark === 0 ? "—" : `${formatHundredths(percentHundredths(passedCount, withMark))}%`}
            hint={
              withMark > 0
                ? `${passedCount} of ${withMark} graded attempts on exams with a pass mark`
                : "No attempts with a pass mark"
            }
            tone="emerald"
          />
        </div>
      </section>

      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-neutral-500">
        Admin report — includes every attempt, even ones whose results the student cannot see yet. The average here
        counts every graded attempt in the filter. Student pages use only each exam&apos;s best attempt.
      </div>

      {/* ============ TABLE ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-sky-400 to-indigo-400" label="Attempts" />
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm font-medium text-white">No attempts match these filters.</p>
            <p className="mt-1 text-sm text-neutral-500">
              Try widening the date range, clearing the name search, or switching the status to “All”.
            </p>
            {hasFilters && (
              <Link
                href="/admin/reports/exam-results"
                className="mt-3 inline-block text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
              >
                Clear all filters
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-white/[0.04] text-left text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                  <tr>
                    <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">Ended (UTC)</th>
                    <th scope="col" className="px-3 py-3 font-medium">Student</th>
                    <th scope="col" className="px-3 py-3 font-medium">Grade</th>
                    <th scope="col" className="px-3 py-3 font-medium">Exam</th>
                    <th scope="col" className="px-3 py-3 font-medium">Subject</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">#</th>
                    <th scope="col" className="px-3 py-3 font-medium">Type</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Score</th>
                    <th scope="col" className="px-3 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-neutral-500">
                        {stamp(r.submittedAt)}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/students/${r.student.id}`}
                          className="font-medium text-white underline-offset-4 hover:underline"
                        >
                          {r.student.lastName}, {r.student.firstName}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-neutral-500">
                        {r.student.gradeLevel
                          ? GRADE_LABELS[r.student.gradeLevel as keyof typeof GRADE_LABELS] ?? r.student.gradeLevel
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/attempts/${r.id}`}
                          className="text-neutral-200 underline-offset-4 hover:text-white hover:underline"
                        >
                          {r.exam.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-neutral-500">{subjectLabel(r.exam.subject)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-neutral-500">{r.attemptNumber}</td>
                      <td className="px-3 py-3 text-neutral-500">
                        {r.assignmentId ? "Assigned" : "Practice"}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                        {r.pointsEarned !== null && r.pointsPossible !== null ? (
                          <>
                            <span className="font-medium text-white">
                              {r.pointsEarned.toString()} / {r.pointsPossible.toString()}
                            </span>
                            <span className="ml-1 text-neutral-500">
                              ({r.percentage?.toString()}%)
                            </span>
                          </>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r.passed === true && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                              <span className="h-1 w-1 rounded-full bg-emerald-400" />
                              Passed
                            </span>
                          )}
                          {r.passed === false && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                              <span className="h-1 w-1 rounded-full bg-rose-400" />
                              Not passed
                            </span>
                          )}
                          {r.passed === null && (
                            <span className="text-xs text-neutral-600">—</span>
                          )}
                          {r.flaggedForReview && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300">
                              <span className="h-1 w-1 rounded-full bg-red-400" />
                              Flagged
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {pageCount > 1 && (
        <nav aria-label="Report pages" className="flex items-center justify-between text-sm">
          <PagerLink href={pageNumber > 1 ? linkFor(pageNumber - 1) : undefined} direction="prev" />
          <span className="text-neutral-500">
            Page <span className="font-medium text-white">{pageNumber}</span> of {pageCount}
          </span>
          <PagerLink href={pageNumber < pageCount ? linkFor(pageNumber + 1) : undefined} direction="next" />
        </nav>
      )}
    </div>
  );
}

/* ============================================================
   StatCard — matches admin home accents
   ============================================================ */
function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone: "indigo" | "violet" | "sky" | "emerald" | "amber" | "rose";
}) {
  const accents: Record<typeof tone, string> = {
    indigo: "from-indigo-400 to-violet-400",
    violet: "from-violet-400 to-fuchsia-400",
    sky: "from-sky-400 to-indigo-400",
    emerald: "from-emerald-400 to-teal-400",
    amber: "from-amber-400 to-orange-400",
    rose: "from-rose-400 to-fuchsia-400",
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
      {hint && (
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">{hint}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status.replace("_", " ").toLowerCase();
  const tone =
    status === "GRADED"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
      : status === "IN_PROGRESS"
        ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
        : status === "SUBMITTED" || status === "EXPIRED"
          ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
          : "border-white/10 bg-white/[0.04] text-neutral-400";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {label}
    </span>
  );
}

function PagerLink({ href, direction }: { href?: string; direction: "prev" | "next" }) {
  const prev = direction === "prev";
  const content = (
    <>
      {prev && (
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {prev ? "Previous" : "Next"}
      {!prev && (
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  const base =
    "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20";
  if (!href) {
    return (
      <span className={`${base} cursor-not-allowed text-neutral-600`} aria-disabled>
        {content}
      </span>
    );
  }
  return (
    <Link href={href} className={`${base} text-neutral-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white`}>
      {content}
    </Link>
  );
}

/* ============================================================
   SectionHeader + WarningIcon — matching admin home
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

function WarningIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
      <path d="M8 2.5 14 13H2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 7v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
    </svg>
  );
}