import { Suspense } from "react";
import ResultsListContent from "./results-list-content";

export default function ResultsListPage() {
  return (
    <Suspense fallback={<ResultsListSkeleton />}>
      <ResultsListContent />
    </Suspense>
  );
}

function ResultsListSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-40 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-56 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
        <div className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
        <div className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
      </div>
    </div>
  );
}