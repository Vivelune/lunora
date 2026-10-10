import { Suspense } from "react";
import AdminHomeContent from "./AdminHomeContent";

export const instant = false;

export default function AdminHomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-8">
          <p className="text-sm text-gray-500">
            Loading admin area...
          </p>
        </main>
      }
    >
      <AdminHomeContent />
    </Suspense>
  );
}