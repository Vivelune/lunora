import { Suspense } from "react";
import NewQuestionContent from "./NewQuestionContent";

export default function NewQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl p-8">
          <p>Loading question form...</p>
        </main>
      }
    >
      <NewQuestionContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}