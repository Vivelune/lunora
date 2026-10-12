import { Suspense } from "react";
import AdminExamsContent from "./AdminExamsContent";


export default function AdminExamsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    error?: string;
    saved?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl p-8">
          <p className="text-sm text-gray-500">Loading exams...</p>
        </main>
      }
    >
      <AdminExamsContent searchParams={searchParams} />
    </Suspense>
  );
}
