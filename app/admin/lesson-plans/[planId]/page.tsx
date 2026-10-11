
import { Suspense } from "react";
import EditLessonPlanContent from "./EditLessonPlanContent";

export const instant = false;

export default function EditLessonPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8">
          <p className="text-sm text-gray-500">
            Loading lesson plan...
          </p>
        </main>
      }
    >
      <EditLessonPlanContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
