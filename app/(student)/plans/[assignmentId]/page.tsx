
import { Suspense } from "react";
import PlanContent from "./PlantContent";


export default function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-8">
          <p className="text-sm text-gray-500">
            Loading lesson plan...
          </p>
        </main>
      }
    >
      <PlanContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
