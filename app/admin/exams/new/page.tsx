
import { Suspense } from "react";
import NewExamContent from "./NewExamContent";

export default function NewExamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl p-8">
          <p className="text-sm text-gray-500">Loading new exam form...</p>
        </main>
      }
    >
      <NewExamContent searchParams={searchParams} />
    </Suspense>
  );
}
