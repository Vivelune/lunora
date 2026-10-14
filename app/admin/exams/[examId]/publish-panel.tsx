import { Suspense } from "react";
import PublishPanelContent from "./publish-panel-content";


export function PublishPanel({ examId }: { examId: string }) {
  return (
    <Suspense
      fallback={
        <section className="rounded-lg border p-5">
          <p className="text-sm text-gray-500">
            Loading publishing information...
          </p>
        </section>
      }
    >
      <PublishPanelContent examId={examId} />
    </Suspense>
  );
}