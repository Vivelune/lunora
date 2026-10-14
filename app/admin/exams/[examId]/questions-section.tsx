import { Suspense } from "react";
import QuestionsSectionContent from "./questions-section-content";

export function QuestionsSection({ examId }: { examId: string }) {
  return (
    <Suspense fallback={<QuestionsSkeleton />}>
      <QuestionsSectionContent examId={examId} />
    </Suspense>
  );
}

function QuestionsSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
  );
}