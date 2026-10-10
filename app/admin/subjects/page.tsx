
import { Suspense } from "react";
import AdminSubjectsContent from "./AdminSubjectsContent";

export default function AdminSubjectsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-8">
          <p className="text-sm text-gray-500">
            Loading subjects...
          </p>
        </main>
      }
    >
      <AdminSubjectsContent />
    </Suspense>
  );
}
