import { Suspense } from "react";
import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function LessonsContent() {
  const { profile } = await requireCompletedProfile();

  // Whatever query makes sense for your schema — this is a sketch.
  const lessons = await prisma.lesson.findMany({
    where: {
      status: "PUBLISHED",
      // ...plus whatever makes them accessible to this student
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      estimatedMinutes: true,
      subject: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
    },
  });

  if (lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
        <p className="text-sm text-neutral-400">No lessons available yet.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {lessons.map((l) => {
        const subject = l.subject.parent
          ? `${l.subject.parent.name} ${l.subject.name}`
          : l.subject.name;

        return (
          <li key={l.id}>
            <Link
              href={`/lessons/${l.id}`}
              className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {l.title}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {subject}
                  {l.estimatedMinutes && (
                    <>
                      {" · "}
                      <span className="tabular-nums">
                        ~{l.estimatedMinutes} min
                      </span>
                    </>
                  )}
                </p>
              </div>
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300"
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
          </li>
        );
      })}
    </ul>
  );
}

export default function LessonsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Lessons
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          All lessons
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Every lesson you have access to.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="flex flex-col gap-2">
            <div className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
            <div className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
          </div>
        }
      >
        <LessonsContent />
      </Suspense>
    </div>
  );
}