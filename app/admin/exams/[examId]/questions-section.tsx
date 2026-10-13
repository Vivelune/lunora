import { Suspense } from "react";
import QuestionsSectionContent from "./questions-section-content";

export function QuestionsSection({ examId }: { examId: string }) {
  return (
    <Suspense
      fallback={
        <section
          id="questions"
          className="rounded-lg border p-5"
        >
          <p className="text-sm text-gray-500">
            Loading questions...
          </p>
        </section>
      }
    >
      <QuestionsSectionContent examId={examId} />
    </Suspense>
  );
}