import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const ADMIN_LINKS = [
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
    icon: UsersIcon,
  },
  {
    href: "/admin/lesson-plans",
    label: "Lesson plans",
    description: "Structured learning paths.",
    icon: PathIcon,
  },
  {
    href: "/admin/assignments",
    label: "Assignments",
    description: "Plans assigned to students.",
    icon: AssignIcon,
  },
  {
    href: "/admin/exams",
    label: "Exams",
    description: "Assessments and practice tests.",
    icon: ExamIcon,
  },
];

export default async function AdminHomeContent() {
  const { profile } = await requireAdmin();

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

      {/* ============ ADMIN LINKS ============ */}
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">
          Manage
        </h2>

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
      <path
        d="M3 2.5h10v11H3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UsersIcon() {
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
      <path
        d="M10 2.5V5h2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6 9h5M6 11.5h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}