
import { Suspense } from "react";
import NewLessonPlanContent from "./NewLessonPlanContent";

export const instant = false;

export default function NewLessonPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl p-8">
          <p className="text-sm text-gray-500">
            Loading new lesson plan form...
          </p>
        </main>
      }
    >
      <NewLessonPlanContent searchParams={searchParams} />
    </Suspense>
  );
}