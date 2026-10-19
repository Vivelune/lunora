import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const REPORTS = [
  {
    href: "/admin/reports/exam-results",
    eyebrow: "Assessments",
    title: "Exam results",
    description:
      "Attempts and scores for every student, broken down by grade, subject, category, exam, date and status.",
    highlights: ["Average score", "Pass rate", "Status breakdown"],
    accent: "from-indigo-400 to-sky-400",
    icon: BarChartIcon,
  },
  {
    href: "/admin/reports/plan-progress",
    eyebrow: "Learning paths",
    title: "Lesson plan progress",
    description:
      "See who has started, finished or fallen behind on assigned lesson plans — and what is overdue.",
    highlights: ["Started / finished", "Behind schedule", "Overdue work"],
    accent: "from-violet-400 to-fuchsia-400",
    icon: ClipboardIcon,
  },
] as const;

export default async function ReportsIndexContent() {
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Analytics
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Reports
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Review exam performance and lesson plan progress across your students.
        </p>
        <div className="mt-5">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-neutral-300"
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5"
            >
              <path
                d="M10 3.5 5.5 8 10 12.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Admin home
          </Link>
        </div>
      </header>

      {/* ============ REPORTS ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Available" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.href}
                href={report.href}
                className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              >
                {/* accent glow */}
                <div
                  aria-hidden
                  className={`absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br ${report.accent} opacity-20 blur-2xl`}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 transition-colors group-hover:border-violet-400/30 group-hover:bg-violet-500/10 group-hover:text-violet-200">
                    <Icon />
                  </span>

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
                </div>

                <div className="relative flex flex-col gap-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                    {report.eyebrow}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {report.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                    {report.description}
                  </p>
                </div>

                <div className="relative mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                    What&apos;s inside
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {report.highlights.map((h) => (
                      <li
                        key={h}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-neutral-400"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <section>
        <div className="mb-4">
          <SectionHeader dot="from-amber-400 to-orange-400" label="Coming soon" />
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-4">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300">
            <DownloadIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">CSV export</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              You will be able to download any report as CSV. Exports
              will never include phone numbers.
            </p>
          </div>
        </div>
      </section>
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
   Icons — inline, matching the admin home style
   ============================================================ */
function BarChartIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M3 13V9M8 13V4M13 13V6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M2.5 13.5h11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <rect
        x="3.5"
        y="3"
        width="9"
        height="10.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6 3V2.5A1.5 1.5 0 0 1 7.5 1h1A1.5 1.5 0 0 1 10 2.5V3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6 7.5h4M6 10h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M8 2.5v7M5 7l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12.5h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}