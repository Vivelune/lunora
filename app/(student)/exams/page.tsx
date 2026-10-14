import { Suspense } from "react";
import ExamsContent from "./exams-content";

export default function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<ExamsSkeleton />}>
      <ExamsContent searchParams={searchParams} />
    </Suspense>
  );
}

function ExamsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* Header */}
      <div>
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-40 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      {/* Info banner */}
      <div className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />

      {/* Section + cards */}
      <div>
        <div className="mb-4 h-5 w-40 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
          <div className="h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
        </div>
      </div>
    </div>
  );
}