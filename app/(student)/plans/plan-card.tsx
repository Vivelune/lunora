import Link from "next/link";
import type { AssignmentSummary } from "@/lib/plan-progress";

const day = (d: Date) => d.toISOString().slice(0, 10);

export function PlanCard({ plan }: { plan: AssignmentSummary }) {
  const percent =
    plan.requiredTotal === 0
      ? 0
      : Math.round((plan.requiredDone / plan.requiredTotal) * 100);
  const status = plan.completedAt
    ? "Completed"
    : plan.doneItems > 0
      ? "In progress"
      : "Not started";

  const isDone = Boolean(plan.completedAt);
  const isFuture = plan.startsInFuture;

  return (
    <article className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.05]">
      {/* ============ HEADER ============ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-white">
            {plan.planTitle}
          </h3>

          <p className="mt-1.5 text-xs text-neutral-500">
            {status}
            {plan.dueDate && (
              <>
                {" · "}
                <span className="text-neutral-400">
                  Due {day(plan.dueDate)}
                </span>
              </>
            )}
            {isFuture && plan.startDate && (
              <>
                {" · "}
                <span className="text-neutral-400">
                  Starts {day(plan.startDate)}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {plan.priority === "HIGH" && !isDone && (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
              High priority
            </span>
          )}
          {plan.isOverdue && (
            <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
              Overdue
            </span>
          )}
          {isDone && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
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
          )}
        </div>
      </div>

      {/* ============ PROGRESS ============ */}
      <div>
        <div className="flex items-baseline justify-between text-xs text-neutral-500">
          <span>
            {plan.requiredDone} of {plan.requiredTotal} required
          </span>
          <span className="font-medium tabular-nums text-neutral-300">
            {percent}%
          </span>
        </div>

        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* ============ NEXT LESSON ============ */}
      {!isDone && !isFuture && plan.nextLessonTitle && (
        <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-300"
          >
            <path
              d="M4 3.5h8v9l-4-2.5-4 2.5v-9Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              Next up
            </p>
            <p className="mt-0.5 truncate text-sm text-neutral-300">
              {plan.nextLessonTitle}
            </p>
          </div>
        </div>
      )}

      {/* ============ FOOTER / ACTION ============ */}
      <div className="mt-auto pt-1">
        {isFuture ? (
          <p className="text-xs text-neutral-500">
            This plan will open on its start date.
          </p>
        ) : (
          <Link
            href={`/plans/${plan.id}`}
            className="group/btn inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/[0.06] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            {isDone ? "Review" : plan.doneItems > 0 ? "Continue" : "Start"}
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
    </article>
  );
}