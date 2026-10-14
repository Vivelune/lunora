import { Suspense } from "react";
import EditQuestionContent from "./EditQuestionContent";

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ examId: string; questionId: string }>;
}) {
  return (
    <Suspense fallback={<EditQuestionSkeleton />}>
      <EditQuestionContent params={params} />
    </Suspense>
  );
}

function EditQuestionSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-72 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="h-[600px] animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}