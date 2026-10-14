import { Suspense } from "react";
import AttemptContent from "./attempt-content";

export default function AttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  return (
    <Suspense fallback={<AttemptSkeleton />}>
      <AttemptContent params={params} />
    </Suspense>
  );
}

function AttemptSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-64 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-48 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      <div className="h-32 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}