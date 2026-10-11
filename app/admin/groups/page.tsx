
import { Suspense } from "react";
import AdminGroupsContent from "./AdminGroupsContent";

export default function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-8">
          <p className="text-sm text-gray-500">
            Loading student groups...
          </p>
        </main>
      }
    >
      <AdminGroupsContent searchParams={searchParams} />
    </Suspense>
  );
}
