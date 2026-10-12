import Link from "next/link";
import type { AssignmentSummary } from "@/lib/plan-progress";

const day = (d: Date) => d.toISOString().slice(0, 10);

export function PlanCard({ plan }: { plan: AssignmentSummary }) {
  const percent =
    plan.requiredTotal === 0 ? 0 : Math.round((plan.requiredDone / plan.requiredTotal) * 100);
  const status = plan.completedAt ? "Completed" : plan.doneItems > 0 ? "In progress" : "Not started";

  return (
    <article className="flex flex-col gap-3 rounded-lg border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{plan.planTitle}</h3>
        {plan.priority === "HIGH" && !plan.completedAt && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">High priority</span>
        )}
        {plan.isOverdue && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Overdue</span>
        )}
      </div>

      <p className="text-sm text-gray-600">
        {status}
        {plan.dueDate && ` - due ${day(plan.dueDate)}`}
        {plan.startsInFuture && plan.startDate && ` - starts ${day(plan.startDate)}`}
      </p>

      <div>
        <div className="h-2 w-full rounded bg-gray-200" aria-hidden="true">
          <div className="h-2 rounded bg-black" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {plan.requiredDone} of {plan.requiredTotal} required lessons complete
        </p>
      </div>

      {!plan.completedAt && !plan.startsInFuture && plan.nextLessonTitle && (
        <p className="text-sm text-gray-600">Next: {plan.nextLessonTitle}</p>
      )}

      {plan.startsInFuture ? (
        <p className="text-sm text-gray-500">This plan will open on its start date.</p>
      ) : (
        <Link href={`/plans/${plan.id}`} className="self-start rounded border px-4 py-1.5 text-sm">
          {plan.completedAt ? "Review" : plan.doneItems > 0 ? "Continue" : "Start"}
        </Link>
      )}
    </article>
  );
}