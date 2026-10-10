import { requireAdmin } from "@/lib/auth";

export default async function AdminHomeContent() {
  const { profile } = await requireAdmin();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-3xl font-bold">Admin area</h1>
      <p className="text-gray-600">Role: {profile.role}</p>
      <p className="text-sm text-gray-500">
        Real admin tools come in later phases.
      </p>
    </main>
  );
}