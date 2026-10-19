import { Suspense } from "react";
import StudentsContent from "./students-content";

type Search = {
  q?: string;
  grade?: string;
  subject?: string;
  onboarding?: string;
  page?: string;
};

export const instant = false;

export default function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<StudentsSkeleton />}>
      <StudentsContent searchParams={searchParams} />
    </Suspense>
  );
}

function StudentsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* Header */}
      <div>
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-48 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      {/* Filter bar */}
      <div className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />

      {/* Table */}
      <div className="h-96 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}