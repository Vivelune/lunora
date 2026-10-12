
import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getStudentAssignments } from "@/lib/plan-progress";
import { PlanCard } from "./plan-card";


export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireCompletedProfile();
  const { error } = await searchParams;

  const all = await getStudentAssignments(profile.id);

  const active = all.filter((plan) => !plan.completedAt);
  const completed = all.filter((plan) => plan.completedAt);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My lesson plans</h1>
        <Link href="/dashboard" className="text-sm underline">
          Back to dashboard
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Current</h2>

        {active.length === 0 ? (
          <p className="rounded border border-dashed p-6 text-gray-500">
            Nothing is assigned to you right now.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Completed</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {completed.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
