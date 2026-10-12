
import { Suspense } from "react";
import StudentLessonContent from "./StudentLessonContent";

export default function StudentLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ assignment?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-8">
          <p className="text-sm text-gray-500">
            Loading lesson...
          </p>
        </main>
      }
    >
      <StudentLessonContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
