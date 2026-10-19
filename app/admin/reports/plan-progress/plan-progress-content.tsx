import Link from "next/link";
import { parseDay } from "@/lib/assignments";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GRADE_LABELS, GRADE_VALUES } from "@/lib/validation/profile";

const PAGE_SIZE = 50;
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");
const subjectLabel = (s: { name: string; parent: { name: string } | null }) =>
  s.parent ? `${s.parent.name} ${s.name}` : s.name;

export default async function PlanProgressContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const { q, grade, subject, category, planId, state, status, from: fromRaw, to: toRaw, page } = sp;

  const now = new Date();
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const terms = (q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
  const gradeFilter = (GRADE_VALUES as readonly string[]).includes(grade ?? "") ? grade : undefined;
  const statusFilter = status === "ACTIVE" ? ("ACTIVE" as const) : status === "CANCELLED" ? ("CANCELLED" as const) : undefined;

  const from = parseDay(fromRaw ?? "", false);
  const to = parseDay(toRaw ?? "", true);
  const dateError = !from.ok || !to.ok ? "One of the dates is not valid, so the date range was ignored." : null;
  const assignedAt = {
    ...(from.ok && from.date ? { gte: from.date } : {}),
    ...(to.ok && to.date ? { lte: to.date } : {}),
  };

  const stateWhere =
    state === "completed"
      ? { completedAt: { not: null } }
      : state === "overdue"
        ? { status: "ACTIVE" as const, completedAt: null, dueDate: { lt: now } }
        : state === "in_progress"
          ? { status: "ACTIVE" as const, completedAt: null, startedAt: { not: null } }
          : state === "not_started"
            ? { status: "ACTIVE" as const, completedAt: null, startedAt: null }
            : {};

  const where = {
    ...stateWhere,
    ...(statusFilter && !stateWhere.status ? { status: statusFilter } : {}),
    ...(Object.keys(assignedAt).length > 0 && !dateError ? { assignedAt } : {}),
    ...(planId ? { planId } : {}),
    plan: {
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

  const [total, rows, completed, started, notStarted, overdue, cancelled, plans, subjects, categories] = await Promise.all([
    prisma.lessonPlanAssignment.count({ where }),
    prisma.lessonPlanAssignment.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        assignedAt: true,
        dueDate: true,
        startedAt: true,
        completedAt: true,
        student: { select: { id: true, firstName: true, lastName: true, gradeLevel: true } },
        plan: { select: { title: true, subject: { select: { name: true, parent: { select: { name: true } } } } } },
        version: { select: { versionNumber: true, items: { select: { id: true, isRequired: true } } } },
        progress: { select: { itemId: true } },
      },
    }),
    prisma.lessonPlanAssignment.count({ where: { AND: [where, { completedAt: { not: null } }] } }),
    prisma.lessonPlanAssignment.count({ where: { AND: [where, { status: "ACTIVE", completedAt: null, startedAt: { not: null } }] } }),
    prisma.lessonPlanAssignment.count({ where: { AND: [where, { status: "ACTIVE", completedAt: null, startedAt: null }] } }),
    prisma.lessonPlanAssignment.count({ where: { AND: [where, { status: "ACTIVE", completedAt: null, dueDate: { lt: now } }] } }),
    prisma.lessonPlanAssignment.count({ where: { AND: [where, { status: "CANCELLED" }] } }),
    prisma.lessonPlan.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
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

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) if (value && key !== "page") params.set(key, value);
    params.set("page", String(p));
    return `/admin/reports/plan-progress?${params.toString()}`;
  };

  const hasFilters = Boolean(
    q || grade || subject || category || planId || state || statusFilter || fromRaw || toRaw
  );

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
            Lesson plan progress
          </h1>
          {total > 0 && (
            <p className="text-sm text-neutral-400">
              <span className="font-medium text-white tabular-nums">{total.toLocaleString()}</span>{" "}
              {total === 1 ? "assignment" : "assignments"} match
            </p>
          )}
        </div>
        <p className="mt-3 text-sm text-neutral-400">
          Who has started, finished, or fallen behind on assigned lesson plans.
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
          aria-label="Filter lesson plan progress"
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
              <label htmlFor="state" className={labelCls}>Progress</label>
              <select id="state" name="state" defaultValue={state ?? ""} className={control}>
                <option value="">Any</option>
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
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
              <label htmlFor="planId" className={labelCls}>Lesson plan</label>
              <select id="planId" name="planId" defaultValue={planId ?? ""} className={control}>
                <option value="">All plans</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="status" className={labelCls}>Assignment status</label>
              <select id="status" name="status" defaultValue={statusFilter ?? ""} className={control}>
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <div className={`${field} flex-1`}>
                <label htmlFor="from" className={labelCls}>Assigned from</label>
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
                href="/admin/reports/plan-progress"
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Assignments" value={total.toLocaleString()} tone="indigo" />
          <StatCard label="Completed" value={completed.toLocaleString()} tone="emerald" />
          <StatCard label="In progress" value={started.toLocaleString()} tone="sky" />
          <StatCard label="Not started" value={notStarted.toLocaleString()} tone="violet" />
          <StatCard
            label="Overdue"
            value={overdue.toLocaleString()}
            tone={overdue > 0 ? "rose" : "neutral"}
          />
          <StatCard label="Cancelled" value={cancelled.toLocaleString()} tone="neutral" />
        </div>
      </section>

      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-neutral-500">
        Counts cover everything that matches the filters, not just this page. Overdue means unfinished and past the due
        date. A plan finished late counts as completed.
      </div>

      {/* ============ TABLE ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-sky-400 to-indigo-400" label="Assignments" />
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm font-medium text-white">No assignments match these filters.</p>
            <p className="mt-1 text-sm text-neutral-500">
              Try widening the date range, clearing the name search, or switching progress to “Any”.
            </p>
            {hasFilters && (
              <Link
                href="/admin/reports/plan-progress"
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
                    <th scope="col" className="px-3 py-3 font-medium">Student</th>
                    <th scope="col" className="px-3 py-3 font-medium">Grade</th>
                    <th scope="col" className="px-3 py-3 font-medium">Plan</th>
                    <th scope="col" className="px-3 py-3 font-medium">Subject</th>
                    <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">Assigned</th>
                    <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">Due</th>
                    <th scope="col" className="px-3 py-3 font-medium">Required lessons</th>
                    <th scope="col" className="px-3 py-3 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const done = new Set(r.progress.map((p) => p.itemId));
                    const required = r.version.items.filter((i) => i.isRequired);
                    const requiredDone = required.filter((i) => done.has(i.id)).length;
                    const isOverdue =
                      r.status === "ACTIVE" &&
                      !r.completedAt &&
                      r.dueDate !== null &&
                      r.dueDate.getTime() < now.getTime();
                    const label =
                      r.status === "CANCELLED"
                        ? "Cancelled"
                        : r.completedAt
                          ? "Completed"
                          : r.startedAt
                            ? "In progress"
                            : "Not started";
                    const pct = required.length === 0 ? 0 : Math.round((requiredDone / required.length) * 100);
                    const dueSoon =
                      !isOverdue &&
                      r.status === "ACTIVE" &&
                      !r.completedAt &&
                      r.dueDate !== null &&
                      r.dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;
                    return (
                      <tr key={r.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.04]">
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
                            href={`/admin/assignments/${r.id}`}
                            className="text-neutral-200 underline-offset-4 hover:text-white hover:underline"
                          >
                            {r.plan.title}
                          </Link>{" "}
                          <span className="text-xs text-neutral-600">v{r.version.versionNumber}</span>
                        </td>
                        <td className="px-3 py-3 text-neutral-500">{subjectLabel(r.plan.subject)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-neutral-500">
                          {day(r.assignedAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                          <span className={dueSoon ? "text-amber-300" : "text-neutral-500"}>
                            {day(r.dueDate)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {required.length === 0 ? (
                            <span className="text-xs text-neutral-600">No required lessons</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-baseline justify-between text-xs">
                                <span className="tabular-nums">
                                  <span className="font-medium text-white">{requiredDone}</span>
                                  <span className="text-neutral-500"> / {required.length}</span>
                                </span>
                                <span className="tabular-nums text-neutral-500">{pct}%</span>
                              </div>
                              <div
                                className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Required lessons completed: ${requiredDone} of ${required.length}`}
                              >
                                <div
                                  className={`h-full rounded-full transition-[width] ${
                                    pct === 100
                                      ? "bg-emerald-400"
                                      : isOverdue
                                        ? "bg-rose-400"
                                        : "bg-white/70"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StateBadge label={label} />
                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                                <span className="h-1 w-1 rounded-full bg-rose-400" />
                                Overdue
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
  tone,
}: {
  label: string;
  value: string | number;
  tone: "indigo" | "violet" | "sky" | "emerald" | "amber" | "rose" | "neutral";
}) {
  const accents: Record<typeof tone, string> = {
    indigo: "from-indigo-400 to-violet-400",
    violet: "from-violet-400 to-fuchsia-400",
    sky: "from-sky-400 to-indigo-400",
    emerald: "from-emerald-400 to-teal-400",
    amber: "from-amber-400 to-orange-400",
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
    </div>
  );
}

function StateBadge({ label }: { label: string }) {
  const tone =
    label === "Completed"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
      : label === "In progress"
        ? "border-sky-400/30 bg-sky-500/10 text-sky-300"
        : label === "Cancelled"
          ? "border-white/10 bg-white/[0.04] text-neutral-400"
          : "border-amber-400/30 bg-amber-500/10 text-amber-300";
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