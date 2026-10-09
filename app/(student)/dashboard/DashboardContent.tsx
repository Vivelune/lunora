import { requireCompletedProfile } from "@/lib/auth";
import { GRADE_LABELS } from "@/lib/validation/profile";

export default async function DashboardContent() {
const { profile } = await requireCompletedProfile();

const grade =
GRADE_LABELS[profile.gradeLevel as keyof typeof GRADE_LABELS] ??
profile.gradeLevel;

return ( <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8"> <h1 className="text-3xl font-bold">
Welcome, {profile.firstName ?? "student"} </h1>


  <p className="text-gray-600">{grade}</p>

  <p className="text-sm text-gray-500">
    Dashboard (temporary) - real content comes in Phase 6.
  </p>
</main>


);
}
