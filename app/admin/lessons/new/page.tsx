import { Suspense } from "react";
import NewLessonContent from "./NewLessonContent";

export default function NewLessonPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl p-8">
          <p className="text-sm text-gray-500">
            Loading lesson form...
          </p>
        </main>
      }
    >
      <NewLessonContent />
    </Suspense>
  );
}
