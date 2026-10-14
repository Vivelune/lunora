import { Suspense } from "react";
import ExamEditorContent from "./ExamEditorContent";

export default function EditExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense fallback={<ExamEditorSkeleton />}>
      <ExamEditorContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function ExamEditorSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-72 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-32 animate-pulse rounded-full bg-white/[0.04]" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-white/[0.04]" />
        </div>
      </div>

      <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      <div className="h-96 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}