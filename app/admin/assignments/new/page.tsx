
import { Suspense } from "react";
import NewAssignmentContent from "./NewAssignmentContent";

export const instant = false;

export default function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-8">
          <p className="text-sm text-gray-500">
            Loading assignment form...
          </p>
        </main>
      }
    >
      <NewAssignmentContent searchParams={searchParams} />
    </Suspense>
  );
}
