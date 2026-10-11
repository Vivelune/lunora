
import { Suspense } from "react";
import AdminLessonPlansContent from "./AdminLessonPlansContent";

export const instant = false;

export default function AdminLessonPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8">
          <p className="text-sm text-gray-500">
            Loading lesson plans...
          </p>
        </main>
      }
    >
      <AdminLessonPlansContent searchParams={searchParams} />
    </Suspense>
  );
}