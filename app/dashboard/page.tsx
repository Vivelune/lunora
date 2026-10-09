import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardPage() {
  const { userId, profile } = await getCurrentProfile();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-3xl font-bold">Dashboard (temporary)</h1>
      <p className="text-sm text-gray-600">Clerk user: {userId}</p>
      <p className="text-sm text-gray-600">
        Neon profile: {profile ? "found" : "none yet"}
      </p>
    </main>
  );
}