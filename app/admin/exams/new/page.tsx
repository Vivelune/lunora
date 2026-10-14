import { Suspense } from "react";
import NewExamContent from "./NewExamContent";

export default function NewExamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<NewExamSkeleton />}>
      <NewExamContent searchParams={searchParams} />
    </Suspense>
  );
}

function NewExamSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-44 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-80 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}