import { Suspense } from "react";
import ReportsIndexContent from "./reports-index-content";

function ReportsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-9 w-40 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-80 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
      </div>

      {/* Section header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-white/[0.1]" />
          <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
        </div>

        {/* Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-white/[0.06]" />
                <div className="h-3.5 w-3.5 animate-pulse rounded bg-white/[0.06]" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-32 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
                <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.06]" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-white/[0.06]" />
                  <div className="h-5 w-24 animate-pulse rounded-full bg-white/[0.06]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportsIndexPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsIndexContent />
    </Suspense>
  );
}