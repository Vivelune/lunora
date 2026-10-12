
import { Suspense } from "react";
import AdminAssignmentsContent from "./AdminAssignmentsContent";

export const instant = false;

export default function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    status?: string;
    planId?: string;
    page?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl p-8">
          <p className="text-sm text-gray-500">
            Loading assignments...
          </p>
        </main>
      }
    >
      <AdminAssignmentsContent searchParams={searchParams} />
    </Suspense>
  );
}
