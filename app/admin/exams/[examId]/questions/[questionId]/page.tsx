
import { Suspense } from "react";
import EditQuestionContent from "./EditQuestionContent";

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ examId: string; questionId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl p-8">
          <p>Loading question...</p>
        </main>
      }
    >
      <EditQuestionContent params={params} />
    </Suspense>
  );
}
