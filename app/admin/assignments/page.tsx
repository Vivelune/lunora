import { Suspense } from "react";
import AdminAssignmentsContent from "./AdminAssignmentsContent";

export const instant = false;

export default function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    status?: string;
    planId?: string;
    page?: string;
  }>;
}) {
  return (
    <Suspense fallback={<AssignmentsSkeleton />}>
      <AdminAssignmentsContent searchParams={searchParams} />
    </Suspense>
  );
}

function AssignmentsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-52 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-64 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      <div className="h-80 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}