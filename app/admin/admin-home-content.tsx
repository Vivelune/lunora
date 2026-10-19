import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { loadAdminOverview } from "@/lib/admin-stats";
import { formatHundredths } from "@/lib/points";

const stamp = (d: Date | null) =>
  d ? d.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—";

const ADMIN_LINKS = [
  {
    href: "/admin/students",
    label: "Students",
    description: "Every student on the platform.",
    icon: UsersIcon,
  },
  {
    href: "/admin/subjects",
    label: "Subjects",
    description: "Top-level curriculum areas.",
    icon: BookIcon,
  },
  {
    href: "/admin/categories",
    label: "Categories",
    description: "Topics inside each subject.",
    icon: GridIcon,
  },
  {
    href: "/admin/lessons",
    label: "Lessons",
    description: "Content students work through.",
    icon: LessonIcon,
  },
  {
    href: "/admin/groups",
    label: "Student groups",
    description: "Cohorts and class rosters.",
    icon: UsersGroupIcon,
  },
  {
    href: "/admin/lesson-plans",
    label: "Lesson plans",
    description: "Structured learning paths.",
    icon: PathIcon,
  },
  {
    href: "/admin/assignments",
    label: "Lesson plan assignments",
    description: "Plans assigned to students.",
    icon: AssignIcon,
  },
  {
    href: "/admin/exams",
    label: "Exams",
    description: "Assessments and practice tests.",
    icon: ExamIcon,
  },
  {
    href: "/admin/exam-assignments",
    label: "Exam assignments",
    description: "Exams assigned to students.",
    icon: ExamAssignIcon,
  },
  {
    href: "/admin/attempts",
    label: "Exam attempts",
    description: "Submissions and focus logs to review.",
    icon: ExamAttemptIcon,
  },
];

export default async function AdminHomeContent() {
  const { profile } = await requireAdmin();
  const o = await loadAdminOverview();
  const overdueTotal = o.overduePlanAssignments + o.missedExamAssignments;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Admin area
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Manage your LMS content and student groups from here.
        </p>
      </header>

      {/* ============ ROLE ============ */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-[13px] font-bold text-neutral-950">
          {profile.role.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
            Signed in as
          </p>
          <p className="mt-0.5 text-sm font-medium text-white">
            {profile.role}
          </p>
        </div>
      </div>

      {/* ============ STATS ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Overview" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Students"
            value={o.students}
            hint={`${o.onboarded} finished onboarding`}
            tone="indigo"
          />

          <StatCard
            label="Active lesson plans"
            value={o.activePlans}
            hint="published and in use"
            tone="violet"
          />

          <StatCard
            label="Pending plan assignments"
            value={o.pendingPlanAssignments}
            hint="active, not completed"
            tone="violet"
          />

          <StatCard
            label="Overdue or missed"
            value={overdueTotal}
            hint={`${o.overduePlanAssignments} plans, ${o.missedExamAssignments} exams`}
            tone={overdueTotal > 0 ? "rose" : "neutral"}
          />

          <StatCard
            label="Published exams"
            value={o.publishedExams}
            hint="live on the platform"
            tone="emerald"
          />

          <StatCard
            label="Exam attempts"
            value={o.attemptsTotal}
            hint={`${o.attemptsGraded} graded, ${o.attemptsInProgress} in progress`}
            tone="sky"
          />

          <StatCard
            label="Flagged attempts"
            value={o.attemptsFlagged}
            hint="focus monitoring"
            tone={o.attemptsFlagged > 0 ? "amber" : "neutral"}
          />

          <StatCard
            label="Average performance"
            value={
              o.averageHundredths === null
                ? "—"
                : `${formatHundredths(o.averageHundredths)}%`
            }
            hint={
              o.averageHundredths === null
                ? "no graded attempts yet"
                : `${formatHundredths(o.earned)} of ${formatHundredths(
                    o.possible
                  )} points across ${o.attemptsGraded} attempts`
            }
            tone="violet"
          />
        </div>
      </section>

      {/* ============ MANAGE ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Manage" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              >
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 transition-colors group-hover:border-violet-400/30 group-hover:bg-violet-500/10 group-hover:text-violet-200">
                  <Icon />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {link.label}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {link.description}
                  </p>
                </div>

                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="mt-2 h-3.5 w-3.5 flex-shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300"
                >
                  <path
                    d="M6 3.5 10.5 8 6 12.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ RECENT ACTIVITY ============ */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Recent submissions */}
        <div>
          <div className="mb-4">
            <SectionHeader
              dot="from-emerald-400 to-teal-400"
              label="Recent submissions"
            />
            <p className="mt-2 text-sm text-neutral-500">
              {o.recentEnded.length === 0
                ? "No submissions yet."
                : `${o.recentEnded.length} recent attempt${
                    o.recentEnded.length === 1 ? "" : "s"
                  }.`}
            </p>
          </div>

          {o.recentEnded.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-neutral-400">No submissions yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {o.recentEnded.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/attempts/${a.id}`}
                    className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">
                          {a.studentName}
                        </p>
                        {a.flaggedForReview && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                            <span className="h-1 w-1 rounded-full bg-rose-400" />
                            Flagged
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {a.exam.title} · attempt{" "}
                        <span className="tabular-nums">
                          {a.attemptNumber}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-3">
                      <span className="text-xs tabular-nums text-neutral-400">
                        {a.percentage !== null
                          ? `${a.percentage.toString()}%`
                          : a.status.toLowerCase()}
                      </span>
                      <span className="text-xs tabular-nums text-neutral-500">
                        {stamp(a.submittedAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <div className="mb-4">
            <SectionHeader
              dot="from-sky-400 to-indigo-400"
              label="Recent student activity"
            />
            <p className="mt-2 text-sm text-neutral-500">
              {o.activity.length === 0
                ? "No activity yet."
                : `Last ${o.activity.length} event${
                    o.activity.length === 1 ? "" : "s"
                  }.`}
            </p>
          </div>

          {o.activity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-neutral-400">No activity yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {o.activity.map((a, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <p className="text-sm text-neutral-300">
                    <span className="font-medium text-white">{a.who}</span>{" "}
                    {a.what}
                  </p>
                  <span className="flex-shrink-0 text-xs tabular-nums text-neutral-500">
                    {stamp(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   StatCard — compact stat with accent glow
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

      {hint && (
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">{hint}</p>
      )}
    </div>
  );
}

/* ============================================================
   SectionHeader — accent dot + uppercase label
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
   Icons — inline so no icon library dependency
   ============================================================ */
function BookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M3 3h5.5a1.5 1.5 0 0 1 1.5 1.5V13L8 11.5 5.5 13V3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 3h-2.5M13 6h-2.5M13 9h-2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <rect x="2.5" y="2.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="2.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function LessonIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path d="M3 2.5h10v11H3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3 13.5c0-2.8 2.2-5 5-5s5 2.2 5 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UsersGroupIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M11 5.5a2 2 0 1 1 0 4M14 13c0-1.7-1.1-3.1-2.5-3.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PathIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <circle cx="3.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="3.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4.5 4.5c3 1 5 2 6 3M4.5 11.5c3-1 5-2 6-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AssignIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <rect
        x="3"
        y="3"
        width="10"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5.5 8.5 7.5 10.5 11 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExamIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M4 2.5h6.5L13 5v8.5H4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 2.5V5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 9h5M6 11.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ExamAssignIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M4 2.5h6.5L13 5v8.5H4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 2.5V5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path
        d="M6 9.5 7.5 11 10.5 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExamAttemptIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M4 2.5h6.5L13 5v8.5H4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 2.5V5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="8" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 8.5V10l1.2.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}