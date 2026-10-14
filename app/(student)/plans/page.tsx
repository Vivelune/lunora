import { Suspense } from "react";
import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getStudentAssignments } from "@/lib/plan-progress";
import { PlanCard } from "./plan-card";

export default function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER (static shell — renders instantly) ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Your plans
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          My lesson plans
        </h1>
      </header>

      {/* ============ DYNAMIC CONTENT (streams in) ============ */}
      <Suspense fallback={<PlansSkeleton />}>
        <PlansContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PlansContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireCompletedProfile();
  const { error } = await searchParams;

  const all = await getStudentAssignments(profile.id);

  const active = all.filter((plan) => !plan.completedAt);
  const completed = all.filter((plan) => plan.completedAt);

  return (
    <>
      {/* ============ COUNT SUBTITLE ============ */}
      <p className="-mt-6 text-sm text-neutral-400">
        {active.length === 0
          ? "You have no active plans right now."
          : `${active.length} active plan${active.length === 1 ? "" : "s"}${
              completed.length > 0 ? ` · ${completed.length} completed` : ""
            }`}
      </p>

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

      {/* ============ CURRENT ============ */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Current
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {active.length === 0
                ? "Nothing assigned yet."
                : "Plans to work on right now."}
            </p>
          </div>
        </div>

        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-neutral-400">
              Nothing is assigned to you right now.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              New work will appear here when your teacher adds it.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </section>

      {/* ============ COMPLETED ============ */}
      {completed.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Completed
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Past work — nice job.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {completed.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ============================================================
   Skeleton — matches the real layout so there's no jump
   ============================================================ */
function PlansSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      {/* Subtitle placeholder */}
      <div className="-mt-6 h-4 w-56 animate-pulse rounded-full bg-white/[0.06]" />

      {/* Current section */}
      <section>
        <div className="mb-4">
          <div className="h-5 w-24 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="mt-2 h-3.5 w-48 animate-pulse rounded-full bg-white/[0.04]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}