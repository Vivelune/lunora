import { Suspense } from "react";
import AssignmentDetailContent from "./AssignmentDetailContent";

export default function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8">
          <p className="text-sm text-gray-500">
            Loading assignment details...
          </p>
        </main>
      }
    >
      <AssignmentDetailContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}