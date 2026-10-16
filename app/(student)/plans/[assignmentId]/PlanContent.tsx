import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { computeItemStates } from "@/lib/plan-progress";
import prisma from "@/lib/prisma";

const day = (d: Date) => d.toISOString().slice(0, 10);

type PlanContentProps = {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function PlanContent({
  params,
  searchParams,
}: PlanContentProps) {
  const { profile } = await requireCompletedProfile();
  const { assignmentId } = await params;
  const { error, saved } = await searchParams;

  // Only this student's own active assignment can be accessed.
  const assignment = await prisma.lessonPlanAssignment.findFirst({
    where: {
      id: assignmentId,
      studentId: profile.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      instructions: true,
      dueDate: true,
      startDate: true,
      completedAt: true,
      plan: {
        select: {
          title: true,
          description: true,
          objectives: true,
        },
      },
      version: {
        select: {
          items: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              isRequired: true,
              lesson: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  estimatedMinutes: true,
                },
              },
            },
          },
        },
      },
      progress: {
        select: { itemId: true },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const items = assignment.version.items;

  const states = computeItemStates(
    items,
    new Set(assignment.progress.map((p) => p.itemId)),
  );

  const notStarted =
    assignment.startDate !== null &&
    assignment.startDate.getTime() > Date.now();

  const overdue =
    !assignment.completedAt &&
    assignment.dueDate !== null &&
    assignment.dueDate.getTime() < Date.now();

  const firstAvailable = items.find(
    (item) => states.get(item.id) === "AVAILABLE",
  )?.id;

  // Progress summary — required items only.
  const requiredItems = items.filter((i) => i.isRequired);
  const requiredDone = requiredItems.filter(
    (i) => states.get(i.id) === "COMPLETED",
  ).length;
  const totalDone = items.filter(
    (i) => states.get(i.id) === "COMPLETED",
  ).length;
  const percent =
    requiredItems.length === 0
      ? 0
      : Math.round((requiredDone / requiredItems.length) * 100);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ BACK LINK ============ */}
      <Link
        href="/plans"
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
        All plans
      </Link>

      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Lesson plan
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {assignment.plan.title}
        </h1>

        {assignment.plan.description && (
          <p className="mt-3 text-base leading-relaxed text-neutral-400">
            {assignment.plan.description}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {assignment.completedAt ? (
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
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Completed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              In your plan
            </span>
          )}

          {assignment.dueDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3"
              >
                <rect
                  x="2.5"
                  y="3.5"
                  width="11"
                  height="10"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Due {day(assignment.dueDate)}
            </span>
          )}

          {overdue && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 5v3.5M8 11h.01"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Overdue
            </span>
          )}
        </div>
      </header>

      {/* ============ PROGRESS ============ */}
      {items.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-white">
              {totalDone} of {items.length} lessons complete
            </span>
            <span className="font-medium tabular-nums text-neutral-300">
              {percent}%
            </span>
          </div>

          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-neutral-500">
            {requiredDone} of {requiredItems.length} required lessons done
          </p>
        </section>
      )}

      {/* ============ ERROR ============ */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <circle
              cx="8"
              cy="8"
              r="6.25"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M8 5v3.5M8 11h.01"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {/* ============ SAVED ============ */}
      {saved && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <path
              d="M3.5 8.5 6.5 11.5 12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{saved}</span>
        </p>
      )}

      {/* ============ INSTRUCTIONS ============ */}
      {assignment.instructions && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-400" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              From your tutor
            </h2>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">
            {assignment.instructions}
          </p>
        </section>
      )}

      {/* ============ NOT STARTED ============ */}
      {notStarted && assignment.startDate && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-white/[0.04] text-neutral-500">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M8 4.5V8l2 1.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-neutral-300">
              This plan opens on {day(assignment.startDate)}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Come back then to get started.
            </p>
          </div>
        </div>
      )}

      {/* ============ LESSON LIST ============ */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Lessons
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {items.length} lesson{items.length === 1 ? "" : "s"} in this plan
          </p>
        </div>

        <ol className="flex flex-col gap-2.5">
          {items.map((item, index) => {
            const state = states.get(item.id) ?? "LOCKED";
            const lesson = item.lesson;
            const lessonOpen = lesson?.status === "PUBLISHED";

            const canOpen =
              !notStarted &&
              state !== "LOCKED" &&
              lessonOpen &&
              lesson !== null;

            const isCompleted = state === "COMPLETED";
            const isLocked = state === "LOCKED";
            const isNext =
              state === "AVAILABLE" &&
              item.id === firstAvailable &&
              !assignment.completedAt;

            return (
              <li
                key={item.id}
                className={`group relative flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                  isLocked
                    ? "border-white/5 bg-white/[0.02]"
                    : isNext
                      ? "border-violet-400/30 bg-violet-500/[0.06]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                {/* Left: number + title */}
                <div className="flex min-w-0 items-start gap-3.5">
                  {/* Number badge */}
                  <span
                    className={`mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      isCompleted
                        ? "bg-emerald-500/15 text-emerald-300"
                        : isLocked
                          ? "border border-white/10 bg-white/[0.03] text-neutral-500"
                          : isNext
                            ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"
                            : "border border-white/15 bg-white/[0.04] text-neutral-300"
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5"
                      >
                        <path
                          d="M3.5 8.5 6.5 11.5 12.5 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : isLocked ? (
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5"
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
                    ) : (
                      index + 1
                    )}
                  </span>

                  {/* Title + meta */}
                  <div className="min-w-0">
                    <p
                      className={`font-medium ${
                        isLocked ? "text-neutral-500" : "text-white"
                      }`}
                    >
                      {lesson?.title ?? "Lesson unavailable"}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                      <span>
                        {item.isRequired ? "Required" : "Optional"}
                      </span>

                      {lesson?.estimatedMinutes && (
                        <>
                          <span className="text-neutral-700">·</span>
                          <span>~{lesson.estimatedMinutes} min</span>
                        </>
                      )}

                      {!lessonOpen && (
                        <>
                          <span className="text-neutral-700">·</span>
                          <span className="text-neutral-600">
                            Unavailable
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: status + action */}
                <div className="flex items-center gap-2">
                  {isNext && (
                    <span className="rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-md shadow-violet-500/25">
                      Next up
                    </span>
                  )}

                  {canOpen && lesson && (
                    <Link
                      href={`/lessons/${lesson.id}?assignment=${assignment.id}`}
                      className="group/btn inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white/[0.06] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
                    >
                      {isCompleted ? "Review" : "Open"}
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5"
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
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}