import { Suspense } from "react";
import NewAssignmentContent from "./NewAssignmentContent";

export const instant = false;

export default function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  return (
    <Suspense fallback={<NewAssignmentSkeleton />}>
      <NewAssignmentContent searchParams={searchParams} />
    </Suspense>
  );
}

function NewAssignmentSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-64 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="h-[560px] animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}