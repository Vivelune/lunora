import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { loadAttemptFacts } from "@/lib/analytics";
import { summarize, type AttemptFact } from "@/lib/analytics-core";
import { formatHundredths } from "@/lib/points";
import prisma from "@/lib/prisma";
import { loadProgressMany } from "@/lib/progress";
import { summarizeExams, summarizePlans } from "@/lib/progress-core";
import { GRADE_LABELS, GRADE_VALUES } from "@/lib/validation/profile";

const PAGE_SIZE = 25;

const inputBase =
  "rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 [color-scheme:dark]";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

type Search = {
  q?: string;
  grade?: string;
  subject?: string;
  onboarding?: string;
  page?: string;
};

export default async function StudentsContent({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdmin();
  const { q, grade, subject, onboarding, page } = await searchParams;

  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const terms = (q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
  const gradeFilter = (GRADE_VALUES as readonly string[]).includes(grade ?? "")
    ? grade
    : undefined;
  const onboardingFilter =
    onboarding === "complete" || onboarding === "incomplete"
      ? onboarding
      : undefined;

  const where = {
    role: "STUDENT" as const,
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
    ...(gradeFilter ? { gradeLevel: gradeFilter } : {}),
    ...(onboardingFilter === "complete"
      ? { onboardingCompletedAt: { not: null } }
      : {}),
    ...(onboardingFilter === "incomplete"
      ? { onboardingCompletedAt: null }
      : {}),
    ...(subject
      ? {
          OR: [
            { assignmentsReceived: { some: { plan: { subjectId: subject } } } },
            { examAssignmentsReceived: { some: { exam: { subjectId: subject } } } },
            { examAttempts: { some: { exam: { subjectId: subject } } } },
          ],
        }
      : {}),
  };

  const [total, rows, subjects] = await Promise.all([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // No phone number here, on purpose.
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        onboardingCompletedAt: true,
      },
    }),
    prisma.subject.findMany({
      where: { isActive: true, children: { none: {} } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, parent: { select: { name: true } } },
    }),
  ]);

  // Progress and scores are computed only for the students on this page.
  const ids = rows.map((r) => r.id);
  const [progress, facts] = await Promise.all([
    loadProgressMany(ids),
    loadAttemptFacts({ studentIds: ids, releasedOnly: false }),
  ]);
  const factsByStudent = new Map<string, AttemptFact[]>();
  for (const f of facts) {
    if (!f.studentId) continue;
    factsByStudent.set(f.studentId, [
      ...(factsByStudent.get(f.studentId) ?? []),
      f,
    ]);
  }

  const now = new Date();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (gradeFilter) params.set("grade", gradeFilter);
    if (subject) params.set("subject", subject);
    if (onboardingFilter) params.set("onboarding", onboardingFilter);
    params.set("page", String(p));
    return `/admin/students?${params.toString()}`;
  };

  const hasFilters =
    Boolean(q) || Boolean(gradeFilter) || Boolean(subject) || Boolean(onboardingFilter);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Students
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {total === 0
            ? "No students match."
            : `${total} student${total === 1 ? "" : "s"}${
                hasFilters ? " match your filters" : " on the platform"
              }.`}
        </p>
      </header>

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
          <div className="min-w-[200px] flex-1">
            <label htmlFor="q" className={labelBase}>
              Search by name
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q ?? ""}
              placeholder="First or last name"
              className={`${inputBase} w-full`}
            />
          </div>

          <div className="min-w-[140px]">
            <label htmlFor="grade" className={labelBase}>
              Grade
            </label>
            <select
              id="grade"
              name="grade"
              defaultValue={gradeFilter ?? ""}
              className={`${inputBase} w-full`}
            >
              <option value="">All grades</option>
              {GRADE_VALUES.map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label htmlFor="subject" className={labelBase}>
              Subject
            </label>
            <select
              id="subject"
              name="subject"
              defaultValue={subject ?? ""}
              className={`${inputBase} w-full`}
            >
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.parent ? `${s.parent.name} ${s.name}` : s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label htmlFor="onboarding" className={labelBase}>
              Profile
            </label>
            <select
              id="onboarding"
              name="onboarding"
              defaultValue={onboardingFilter ?? ""}
              className={`${inputBase} w-full`}
            >
              <option value="">All</option>
              <option value="complete">Complete</option>
              <option value="incomplete">Incomplete</option>
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
            Apply
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
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
            &ldquo;Subject&rdquo; means assigned work or an attempt in that
            subject. Scores include every graded attempt, including ones not
            yet released to the student.
          </span>
        </p>
      </form>

      {/* ============ EMPTY STATE ============ */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">No students match.</p>
          <p className="mt-1 text-xs text-neutral-500">
            {hasFilters
              ? "Try clearing the filters to see everyone."
              : "Students will appear here once they sign up."}
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
                    Grade
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 md:table-cell">
                    Profile
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:table-cell">
                    Plan completion
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:table-cell">
                    Overdue
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 md:table-cell">
                    Exams
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 lg:table-cell">
                    Attempts
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const mine = progress.get(r.id) ?? { plans: [], exams: [] };
                  const plans = summarizePlans(mine.plans, now);
                  const exams = summarizeExams(mine.exams, now);
                  const perf = summarize(factsByStudent.get(r.id) ?? []);
                  const overdue = plans.overdue + exams.missed;
                  const complete = Boolean(r.onboardingCompletedAt);

                  return (
                    <tr
                      key={r.id}
                      className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                    >
                      {/* Student */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/students/${r.id}`}
                          className="group/link inline-flex items-center gap-2 font-medium text-white transition-colors hover:text-violet-200"
                        >
                          <span className="truncate">
                            {r.lastName}, {r.firstName}
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

                      {/* Grade */}
                      <td className="hidden px-5 py-4 text-neutral-400 sm:table-cell">
                        {r.gradeLevel ? (
                          GRADE_LABELS[
                            r.gradeLevel as keyof typeof GRADE_LABELS
                          ] ?? r.gradeLevel
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Profile */}
                      <td className="hidden px-5 py-4 md:table-cell">
                        {complete ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                            Incomplete
                          </span>
                        )}
                      </td>

                      {/* Plan completion */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        {plans.completionHundredths === null ? (
                          <span className="text-neutral-600">—</span>
                        ) : (
                          <span className="inline-flex items-baseline gap-2 text-sm">
                            <span className="font-medium tabular-nums text-neutral-200">
                              {formatHundredths(plans.completionHundredths)}%
                            </span>
                            <span className="text-xs tabular-nums text-neutral-500">
                              {plans.completed}/{plans.total}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Overdue */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        {overdue > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            {overdue}
                          </span>
                        ) : (
                          <span className="text-neutral-600">0</span>
                        )}
                      </td>

                      {/* Exams taken */}
                      <td className="hidden px-5 py-4 md:table-cell">
                        <span className="tabular-nums text-neutral-400">
                          {exams.completed}/{exams.total}
                        </span>
                      </td>

                      {/* Attempts */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        <span className="tabular-nums text-neutral-400">
                          {perf.attempts}
                        </span>
                      </td>

                      {/* Average */}
                      <td className="px-5 py-4">
                        {perf.averageHundredths === null ? (
                          <span className="text-neutral-600">—</span>
                        ) : (
                          <span className="font-semibold tabular-nums text-white">
                            {formatHundredths(perf.averageHundredths)}%
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
          aria-label="Student pages"
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
            Page{" "}
            <span className="tabular-nums text-neutral-300">{pageNumber}</span>{" "}
            of{" "}
            <span className="tabular-nums text-neutral-300">{pageCount}</span>
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