import { Suspense } from "react";
import AdminHomeContent from "./AdminHomeContent";

export const instant = false;

export default function AdminHomePage() {
  return (
    <Suspense fallback={<AdminHomeSkeleton />}>
      <AdminHomeContent />
    </Suspense>
  );
}

function AdminHomeSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <div>
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="mt-3 h-9 w-56 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mt-3 h-4 w-full max-w-sm animate-pulse rounded-full bg-white/[0.04]" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]"
          />
        ))}
      </div>
    </div>
  );
}