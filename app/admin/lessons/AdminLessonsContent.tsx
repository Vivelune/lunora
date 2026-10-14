import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

const FILTERS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const FILTER_LABELS: Record<(typeof FILTERS)[number], string> = {
  ALL: "All",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export default async function AdminLessonsContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Keep authorization on the server.
  await requireAdmin();

  const { status } = await searchParams;
  const active = FILTERS.find((filter) => filter === status) ?? "ALL";

  const lessons = await prisma.lesson.findMany({
    where: active === "ALL" ? {} : { status: active },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      subject: {
        select: {
          name: true,
          parent: {
            select: { name: true },
          },
        },
      },
      category: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Lessons
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            {lessons.length === 0
              ? "No lessons match this filter."
              : `${lessons.length} lesson${lessons.length === 1 ? "" : "s"}${
                  active === "ALL"
                    ? ""
                    : ` · ${FILTER_LABELS[active].toLowerCase()}`
                }`}
          </p>
        </div>

        <Link
          href="/admin/lessons/new"
          className="group inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
          >
            <path
              d="M8 3.5v9M3.5 8h9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          New lesson
        </Link>
      </header>

      {/* ============ FILTER TABS ============ */}
      <nav className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((filter) => {
          const isActive = filter === active;
          return (
            <Link
              key={filter}
              href={
                filter === "ALL"
                  ? "/admin/lessons"
                  : `/admin/lessons?status=${filter}`
              }
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border border-white/15 bg-white/[0.06] text-white"
                  : "border border-transparent text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200"
              }`}
            >
              {FILTER_LABELS[filter]}
            </Link>
          );
        })}
      </nav>

      {/* ============ EMPTY STATE ============ */}
      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">
            {active === "ALL"
              ? "No lessons here yet."
              : `No ${FILTER_LABELS[active].toLowerCase()} lessons.`}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {active === "ALL"
              ? "Create your first lesson to get started."
              : "Try a different filter, or create a new lesson."}
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
                    Lesson
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Subject
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 sm:table-cell">
                    Category
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Status
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 md:table-cell">
                    Updated
                  </th>
                </tr>
              </thead>

              <tbody>
                {lessons.map((lesson) => (
                  <tr
                    key={lesson.id}
                    className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                  >
                    {/* Title */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/lessons/${lesson.id}`}
                        className="group/link inline-flex items-center gap-2 font-medium text-white transition-colors hover:text-violet-200"
                      >
                        <span className="truncate">
                          {lesson.title}
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

                    {/* Subject */}
                    <td className="px-5 py-4 text-neutral-400">
                      {lesson.subject.parent
                        ? `${lesson.subject.parent.name} ${lesson.subject.name}`
                        : lesson.subject.name}
                    </td>

                    {/* Category */}
                    <td className="hidden px-5 py-4 text-neutral-400 sm:table-cell">
                      {lesson.category?.name ?? (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusPill status={lesson.status} />
                    </td>

                    {/* Updated */}
                    <td className="hidden px-5 py-4 text-neutral-500 md:table-cell">
                      <span className="tabular-nums">
                        {lesson.updatedAt.toISOString().slice(0, 10)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ FOOTER BACK LINK ============ */}
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

/* ============================================================
   StatusPill — shared visual language with student pages
   ============================================================ */
function StatusPill({ status }: { status: string }) {
  if (status === "PUBLISHED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Published
      </span>
    );
  }

  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Draft
      </span>
    );
  }

  if (status === "ARCHIVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        Archived
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
      {status}
    </span>
  );
}