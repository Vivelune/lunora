
import { Suspense } from "react";
import ExamEditorContent from "./ExamEditorContent";

export default function EditExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8">
          <p className="text-sm text-gray-500">Loading exam...</p>
        </main>
      }
    >
      <ExamEditorContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
