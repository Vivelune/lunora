import { Suspense } from "react";
import AdminLessonsContent from "./AdminLessonsContent";

export default function AdminLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8">
          <p className="text-sm text-gray-500">Loading lessons...</p>
        </main>
      }
    >
      <AdminLessonsContent searchParams={searchParams} />
    </Suspense>
  );
}