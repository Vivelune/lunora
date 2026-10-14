import { Suspense } from "react";
import PlanContent from "./PlantContent";

export default function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense fallback={<PlanSkeleton />}>
      <PlanContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function PlanSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* Back link */}
      <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.06]" />

      {/* Header */}
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-72 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      {/* Progress card */}
      <div className="h-28 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />

      {/* Lesson list */}
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]"
          />
        ))}
      </div>
    </div>
  );
}