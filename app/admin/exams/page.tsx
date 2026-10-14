import { Suspense } from "react";
import AdminExamsContent from "./AdminExamsContent";

export default function AdminExamsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    error?: string;
    saved?: string;
  }>;
}) {
  return (
    <Suspense fallback={<ExamsSkeleton />}>
      <AdminExamsContent searchParams={searchParams} />
    </Suspense>
  );
}

function ExamsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-32 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-56 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="h-8 w-72 animate-pulse rounded-full bg-white/[0.04]" />

      <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}