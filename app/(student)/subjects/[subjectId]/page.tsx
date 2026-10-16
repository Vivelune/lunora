import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function SubjectDetailContent({ subjectId }: { subjectId: string }) {
  const { profile } = await requireCompletedProfile();

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      isActive: true,
      children: { none: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      description: true,
      parent: { select: { name: true } },
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              lessons: {
                where: { status: "PUBLISHED" },
              },
            },
          },
        },
      },
      lessons: {
        where: { status: "PUBLISHED" },
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          estimatedMinutes: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  if (!subject) {
    notFound();
  }

  // Plans assigned to this student in this subject.
  // Subject lives on the plan, so we filter through `plan.subjectId`.
  const assignments = await prisma.lessonPlanAssignment.findMany({
    where: {
      studentId: profile.id,
      status: "ACTIVE",
      completedAt: null,
      plan: { subjectId: subject.id },
    },
    orderBy: { assignedAt: "desc" },
    select: {
      id: true,
      plan: { select: { title: true } },
      dueDate: true,
      version: {
        select: {
          items: { select: { id: true, isRequired: true } },
        },
      },
      progress: { select: { itemId: true } },
    },
  });

  const subjectLabel = subject.parent
    ? `${subject.parent.name} ${subject.name}`
    : subject.name;

  return (
    <div className="flex flex-col gap-10">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          {subject.parent ? subject.parent.name : "Subject"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {subject.parent ? subject.name : subjectLabel}
        </h1>
        {subject.description && (
          <p className="mt-3 text-base leading-relaxed text-neutral-400">
            {subject.description}
          </p>
        )}
      </header>

      {/* ============ PLANS ASSIGNED ============ */}
      {assignments.length > 0 && (
        <section>
          <div className="mb-4">
            <SectionHeader
              dot="from-violet-400 to-fuchsia-400"
              label="Assigned to you"
            />
            <p className="mt-2 text-sm text-neutral-500">
              {assignments.length} active plan
              {assignments.length === 1 ? "" : "s"} in this subject.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {assignments.map((a) => {
              const required = a.version.items.filter((i) => i.isRequired);
              const done = a.progress.filter((p) =>
                required.some((i) => i.id === p.itemId),
              ).length;
              const percent =
                required.length === 0
                  ? 0
                  : Math.round((done / required.length) * 100);

              return (
                <li key={a.id}>
                  <Link
                    href={`/plans/${a.id}`}
                    className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {a.plan.title}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        <span className="tabular-nums">{done}</span> of{" "}
                        <span className="tabular-nums">
                          {required.length}
                        </span>{" "}
                        required lessons
                        {a.dueDate && (
                          <>
                            {" · "}
                            Due{" "}
                            <span className="tabular-nums">
                              {a.dueDate.toISOString().slice(0, 10)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-4">
                      <span className="text-sm font-semibold tabular-nums text-neutral-300">
                        {percent}%
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 transition-colors group-hover:text-violet-200">
                        Open
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
              );
            })}
          </ul>
        </section>
      )}

      {/* ============ TOPICS ============ */}
      {subject.categories.length > 0 && (
        <section>
          <div className="mb-4">
            <SectionHeader dot="from-sky-400 to-indigo-400" label="Topics" />
            <p className="mt-2 text-sm text-neutral-500">
              {subject.categories.length} topic
              {subject.categories.length === 1 ? "" : "s"} in this subject.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {subject.categories.map((c) => (
              <article
                key={c.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
              >
                <h3 className="text-sm font-semibold tracking-tight text-white">
                  {c.name}
                </h3>
                {c.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-400">
                    {c.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-neutral-500">
                  {c._count.lessons} lesson
                  {c._count.lessons === 1 ? "" : "s"}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ============ LESSONS ============ */}
      {subject.lessons.length > 0 && (
        <section>
          <div className="mb-4">
            <SectionHeader
              dot="from-emerald-400 to-teal-400"
              label="Lessons"
            />
            <p className="mt-2 text-sm text-neutral-500">
              {subject.lessons.length} published lesson
              {subject.lessons.length === 1 ? "" : "s"}.
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {subject.lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/lessons/${l.id}`}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3.5 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {l.title}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {l.category && (
                        <>
                          {l.category.name}
                          {" · "}
                        </>
                      )}
                      {l.estimatedMinutes && (
                        <span className="tabular-nums">
                          ~{l.estimatedMinutes} min
                        </span>
                      )}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 transition-colors group-hover:text-violet-200">
                    Open
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
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ EMPTY ============ */}
      {subject.categories.length === 0 &&
        subject.lessons.length === 0 &&
        assignments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-neutral-400">
              Nothing is available in this subject yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Content will appear here once it&apos;s published.
            </p>
          </div>
        )}

      {/* ============ BACK LINK ============ */}
      <Link
        href="/subjects"
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
        All subjects
      </Link>
    </div>
  );
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <Suspense fallback={<SubjectDetailSkeleton />}>
        <SubjectDetailContent subjectId={subjectId} />
      </Suspense>
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

function SubjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-72 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded-full bg-white/[0.04]" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]"
          />
        ))}
      </div>
    </div>
  );
}