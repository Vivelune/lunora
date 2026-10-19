import { Suspense } from "react";
import ExamResultsContent from "./exam-results-content";

function ExamResultsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-9 w-56 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-96 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-white/[0.1]" />
          <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-7 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
    </div>
  );
}

export default function ExamResultsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <Suspense fallback={<ExamResultsSkeleton />}>
      <ExamResultsContent searchParams={searchParams} />
    </Suspense>
  );
}