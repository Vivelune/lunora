import { Suspense } from "react";
import ResultsReleasePanelContent from "./results-release-panel-content";

export function ResultsReleasePanel({ examId }: { examId: string }) {
  return (
    <Suspense fallback={<ReleasePanelSkeleton />}>
      <ResultsReleasePanelContent examId={examId} />
    </Suspense>
  );
}

function ReleasePanelSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
  );
}