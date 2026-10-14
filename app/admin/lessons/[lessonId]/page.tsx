import { Suspense } from "react";
import EditLessonContent from "./EditLessonContent";

export default function EditLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense fallback={<EditLessonSkeleton />}>
      <EditLessonContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function EditLessonSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-56 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="h-12 w-full max-w-md animate-pulse rounded-full bg-white/[0.04]" />
      <div className="h-96 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
    </div>
  );
}