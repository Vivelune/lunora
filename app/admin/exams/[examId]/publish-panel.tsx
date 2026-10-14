import { Suspense } from "react";
import PublishPanelContent from "./publish-panel-content";

export function PublishPanel({ examId }: { examId: string }) {
  return (
    <Suspense fallback={<PublishSkeleton />}>
      <PublishPanelContent examId={examId} />
    </Suspense>
  );
}

function PublishSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
  );
}