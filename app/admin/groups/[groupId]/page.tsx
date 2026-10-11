
import { Suspense } from "react";
import AdminGroupContent from "./AdminGroupContent";

export default function AdminGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-8">
          <p className="text-sm text-gray-500">
            Loading student group...
          </p>
        </main>
      }
    >
      <AdminGroupContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}