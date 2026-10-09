
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardContent() {
  const { userId, profile } = await getCurrentProfile();

  return (
    <div className="flex flex-col items-center gap-3">
      <h1 className="text-3xl font-bold">
        Dashboard (temporary)
      </h1>

      <p className="text-sm text-gray-600">
        Clerk user: {userId}
      </p>

      <p className="text-sm text-gray-600">
        Neon profile: {profile ? "found" : "none yet"}
      </p>
    </div>
  );
}