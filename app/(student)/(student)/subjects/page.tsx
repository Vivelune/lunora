import { Suspense } from "react";
import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function SubjectsContent() {
  const { profile } = await requireCompletedProfile();

  const [subjects, assignments] = await Promise.all([
    prisma.subject.findMany({
      where: {
        isActive: true,
        children: {
          none: { isActive: true },
        },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        parent: { select: { name: true } },
        _count: {
          select: {
            categories: {
              where: { isActive: true },
            },
            lessons: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
    }),

    prisma.lessonPlanAssignment.findMany({
      where: {
        studentId: profile.id,
        status: "ACTIVE",
        completedAt: null,
      },
      select: {
        plan: { select: { subjectId: true } },
      },
    }),
  ]);

  const assignedBySubject = new Map<string, number>();
  for (const a of assignments) {
    const subjectId = a.plan.subjectId;
    assignedBySubject.set(
      subjectId,
      (assignedBySubject.get(subjectId) ?? 0) + 1,
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
        <p className="text-sm text-neutral-400">
          No subjects are available yet.
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          They&apos;ll show up here once they&apos;re published.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject) => {
        const assigned = assignedBySubject.get(subject.id) ?? 0;
        const label = subject.parent
          ? `${subject.parent.name} ${subject.name}`
          : subject.name;
        const lessonCount = subject._count.lessons;

        return (
          <Link
            key={subject.id}
            href={`/subjects/${subject.id}`}
            className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.05]"
          >
            <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 opacity-70" />

            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold tracking-tight text-white">
                {label}
              </h3>

              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300"
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

            {subject.description && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-400">
                {subject.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-neutral-400">
                {subject._count.categories} topic
                {subject._count.categories === 1 ? "" : "s"}
              </span>

              {lessonCount > 0 && (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-neutral-400">
                  {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
                </span>
              )}

              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                  assigned > 0
                    ? "border border-violet-400/30 bg-violet-500/10 text-violet-200"
                    : "border border-white/10 bg-white/[0.03] text-neutral-500"
                }`}
              >
                {assigned > 0 ? `${assigned} assigned` : "Not assigned"}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function SubjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Subjects
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Subjects
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Browse every subject you have access to.
        </p>
      </header>

      <Suspense fallback={<SubjectsSkeleton />}>
        <SubjectsContent />
      </Suspense>
    </div>
  );
}

function SubjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]"
        />
      ))}
    </div>
  );
}