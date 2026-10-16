import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { getLessonForStudent } from "@/lib/lesson-access";
import {
  computeItemStates,
  type ItemState,
} from "@/lib/plan-progress";
import prisma from "@/lib/prisma";

import { completeItem } from "../../plans/actions";
import { Markdown } from "@/app/components/markdown";

type StudentLessonContentProps = {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ assignment?: string }>;
};

export default async function StudentLessonContent({
  params,
  searchParams,
}: StudentLessonContentProps) {
  const { profile } = await requireCompletedProfile();
  const { lessonId } = await params;
  const { assignment: assignmentId } = await searchParams;

  const lesson = await getLessonForStudent(lessonId, profile.id);

  // A blocked lesson (locked, draft, archived, unassigned) gets a friendly
  // page instead of a raw 404. Only a lesson that genuinely doesn't exist
  // is worth a 404 — but even that is handled here for consistency.
  if (!lesson) {
    return <LessonUnavailable assignmentId={assignmentId} />;
  }

  let completion: {
    assignmentId: string;
    itemId: string;
    state: ItemState;
  } | null = null;

  if (assignmentId) {
    const assignment = await prisma.lessonPlanAssignment.findFirst({
      where: {
        id: assignmentId,
        studentId: profile.id,
        status: "ACTIVE",
      },
      select: {
        id: true,
        version: {
          select: {
            items: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                isRequired: true,
                lessonId: true,
              },
            },
          },
        },
        progress: {
          select: { itemId: true },
        },
      },
    });

    if (assignment) {
      const states = computeItemStates(
        assignment.version.items,
        new Set(assignment.progress.map((p) => p.itemId)),
      );

      const item = assignment.version.items.find(
        (i) => i.lessonId === lesson.id,
      );

      if (item) {
        completion = {
          assignmentId: assignment.id,
          itemId: item.id,
          state: states.get(item.id) ?? "LOCKED",
        };
      }
    }
  }

  const subject = lesson.subject.parent
    ? `${lesson.subject.parent.name} ${lesson.subject.name}`
    : lesson.subject.name;

  const isCompleted = completion?.state === "COMPLETED";
  const isAvailable = completion?.state === "AVAILABLE";
  const isLocked = completion?.state === "LOCKED";

  return (
    <main className="relative min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-15%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
        {/* ============ BACK LINK ============ */}
        {completion && (
          <Link
            href={`/plans/${completion.assignmentId}`}
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
            Back to your plan
          </Link>
        )}

        {/* ============ HEADER ============ */}
        <header>
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            <span>{subject}</span>
            {lesson.category && (
              <>
                <span className="text-neutral-700">/</span>
                <span>{lesson.category.name}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {lesson.title}
          </h1>

          {/* Description */}
          {lesson.description && (
            <p className="mt-3 text-base leading-relaxed text-neutral-400">
              {lesson.description}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {lesson.estimatedMinutes && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3 w-3"
                >
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                  <path
                    d="M8 4.5V8l2 1.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                ~{lesson.estimatedMinutes} min
              </span>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3 w-3"
                >
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Completed
              </span>
            )}

            {isLocked && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-500">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3 w-3"
                >
                  <rect
                    x="3.5"
                    y="7"
                    width="9"
                    height="6"
                    rx="1.2"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                Locked
              </span>
            )}
          </div>
        </header>

        {/* ============ OBJECTIVES ============ */}
        {lesson.objectives.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
                What you&apos;ll learn
              </h2>
            </div>

            <ul className="flex flex-col gap-2.5">
              {lesson.objectives.map((objective, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm leading-relaxed text-neutral-300"
                >
                  <span className="mt-[3px] grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-[9px] font-semibold text-neutral-400">
                    {index + 1}
                  </span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ============ CONTENT ============ */}
        <article className="prose prose-invert prose-neutral max-w-none prose-headings:tracking-tight prose-headings:text-white prose-p:text-neutral-300 prose-p:leading-relaxed prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-code:text-violet-200 prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-violet-400/40 prose-blockquote:text-neutral-400 prose-li:text-neutral-300">
          <Markdown>{lesson.content}</Markdown>
        </article>

        {/* ============ RESOURCES ============ */}
        {lesson.resources.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Materials
              </h2>
            </div>

            <ul className="flex flex-col gap-1">
              {lesson.resources.map((resource) => (
                <li key={resource.id}>
                  <a
                    href={`/api/resources/${resource.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 text-neutral-500 group-hover:text-violet-300"
                      >
                        <path
                          d="M6.5 3.5h-3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-3M9.5 2.5H13v3.5M13 3 7.5 8.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {resource.title}
                    </span>
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
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ============ COMPLETION ============ */}
        {completion && (
          <div className="border-t border-white/10 pt-8">
            {completion.state === "AVAILABLE" && (
              <form action={completeItem} className="flex flex-col gap-3">
                <input
                  type="hidden"
                  name="assignmentId"
                  value={completion.assignmentId}
                />
                <input
                  type="hidden"
                  name="itemId"
                  value={completion.itemId}
                />

                <button
                  type="submit"
                  className="group inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Mark lesson complete
                </button>

                <p className="text-xs text-neutral-500">
                  Your progress is saved automatically once you complete this lesson.
                </p>
              </form>
            )}

            {completion.state === "COMPLETED" && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-5 py-4">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-emerald-200">
                    Lesson completed
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-300/70">
                    Nice work — keep the streak going.
                  </p>
                </div>
              </div>
            )}

            {completion.state === "LOCKED" && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-white/[0.04] text-neutral-500">
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <rect
                      x="3.5"
                      y="7"
                      width="9"
                      height="6"
                      rx="1.2"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-300">
                    Complete the previous lesson to unlock this one
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Head back to your plan to see what&apos;s next.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   LessonUnavailable — friendly state for blocked lessons
   ============================================================ */
   function LessonUnavailable({ assignmentId }: { assignmentId?: string }) {
    const backHref = assignmentId ? `/plans/${assignmentId}` : "/plans";
    const backLabel = assignmentId ? "Back to your plan" : "Back to my plans";
  
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-16 sm:py-24">
        {/* Back link */}
        <Link
          href={backHref}
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
          {backLabel}
        </Link>
  
        {/* Info card */}
        <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-6 backdrop-blur">
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-white/[0.04] text-neutral-400">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4"
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
          </span>
  
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              This lesson isn&apos;t available
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              It may be locked behind earlier lessons, still being prepared, or
              not part of your current plan. Head back to your plans to see
              what&apos;s next.
            </p>
          </div>
        </div>
  
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={backHref}
            className="group inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/[0.06] px-5 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            {backLabel}
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
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
  
          <Link
            href="/subjects"
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Browse subjects
          </Link>
        </div>
      </div>
    );
  }