
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { computeItemStates } from "@/lib/plan-progress";
import  prisma  from "@/lib/prisma";

const day = (d: Date) => d.toISOString().slice(0, 10);

type PlanContentProps = {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function PlanContent({
  params,
  searchParams,
}: PlanContentProps) {
  const { profile } = await requireCompletedProfile();
  const { assignmentId } = await params;
  const { error, saved } = await searchParams;

  // Only this student's own active assignment can be accessed.
  const assignment = await prisma.lessonPlanAssignment.findFirst({
    where: {
      id: assignmentId,
      studentId: profile.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      instructions: true,
      dueDate: true,
      startDate: true,
      completedAt: true,
      plan: {
        select: {
          title: true,
          description: true,
          objectives: true,
        },
      },
      version: {
        select: {
          items: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              isRequired: true,
              lesson: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  estimatedMinutes: true,
                },
              },
            },
          },
        },
      },
      progress: {
        select: { itemId: true },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const items = assignment.version.items;

  const states = computeItemStates(
    items,
    new Set(assignment.progress.map((p) => p.itemId)),
  );

  const notStarted =
    assignment.startDate !== null &&
    assignment.startDate.getTime() > Date.now();

  const overdue =
    !assignment.completedAt &&
    assignment.dueDate !== null &&
    assignment.dueDate.getTime() < Date.now();

  const firstAvailable = items.find(
    (item) => states.get(item.id) === "AVAILABLE",
  )?.id;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {assignment.plan.title}
          </h1>

          {assignment.plan.description && (
            <p className="mt-1 text-gray-600">
              {assignment.plan.description}
            </p>
          )}

          <p className="mt-1 text-sm text-gray-500">
            {assignment.completedAt ? "Completed" : "In your plan"}
            {assignment.dueDate &&
              ` - due ${day(assignment.dueDate)}`}

            {overdue && (
              <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                Overdue
              </span>
            )}
          </p>
        </div>

        <Link href="/plans" className="text-sm underline">
          All plans
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

      {saved && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700"
        >
          {saved}
        </p>
      )}

      {assignment.instructions && (
        <section className="rounded border bg-gray-50 p-4 text-sm">
          <h2 className="mb-1 font-semibold">
            Instructions from your tutor
          </h2>
          <p className="whitespace-pre-line">
            {assignment.instructions}
          </p>
        </section>
      )}

      {notStarted && assignment.startDate && (
        <p className="rounded border border-dashed p-4 text-sm text-gray-600">
          This plan opens on {day(assignment.startDate)}.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {items.map((item, index) => {
          const state = states.get(item.id) ?? "LOCKED";
          const lesson = item.lesson;
          const lessonOpen = lesson?.status === "PUBLISHED";

          const canOpen =
            !notStarted &&
            state !== "LOCKED" &&
            lessonOpen &&
            lesson !== null;

          return (
            <li
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded border p-4 ${
                state === "LOCKED"
                  ? "bg-gray-50 text-gray-500"
                  : ""
              }`}
            >
              <div>
                <p className="font-medium">
                  {index + 1}.{" "}
                  {lesson?.title ?? "Lesson unavailable"}
                </p>

                <p className="text-xs text-gray-500">
                  {item.isRequired ? "Required" : "Optional"}

                  {lesson?.estimatedMinutes &&
                    ` - about ${lesson.estimatedMinutes} min`}

                  {!lessonOpen && " - temporarily unavailable"}
                </p>
              </div>

              <div className="flex items-center gap-3 text-sm">
                {state === "COMPLETED" && (
                  <span className="text-green-700">
                    Completed
                  </span>
                )}

                {state === "LOCKED" && <span>Locked</span>}

                {state === "AVAILABLE" &&
                  item.id === firstAvailable &&
                  !assignment.completedAt && (
                    <span className="rounded bg-black px-1.5 py-0.5 text-xs text-white">
                      Next up
                    </span>
                  )}

                {canOpen && lesson && (
                  <Link
                    href={`/lessons/${lesson.id}?assignment=${assignment.id}`}
                    className="rounded border px-3 py-1"
                  >
                    {state === "COMPLETED" ? "Review" : "Open"}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
