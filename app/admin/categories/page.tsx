
import { Suspense } from "react";
import AdminCategoriesContent from "./AdminCategoriesContent";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8">
          <p className="text-sm text-gray-500">
            Loading category management...
          </p>
        </main>
      }
    >
      <AdminCategoriesContent searchParams={searchParams} />
    </Suspense>
  );
}
