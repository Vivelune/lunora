
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
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl p-8">
          <p className="text-sm text-gray-500">
            Loading lesson editor...
          </p>
        </main>
      }
    >
      <EditLessonContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
