
import { Suspense, type ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";

async function AdminLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="p-8">
          <p className="text-sm text-gray-500">
            Loading admin area...
          </p>
        </main>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
