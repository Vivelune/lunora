
import { Suspense } from "react";
import DashboardContent from "@/app/components/DashboardContent";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <Suspense
        fallback={
          <p className="text-sm text-gray-500">
            Loading your dashboard...
          </p>
        }
      >
        <DashboardContent />
      </Suspense>
    </main>
  );
}