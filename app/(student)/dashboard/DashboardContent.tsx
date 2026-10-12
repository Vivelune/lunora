
import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getStudentAssignments } from "@/lib/plan-progress";
import prisma from "@/lib/prisma";
import { GRADE_LABELS } from "@/lib/validation/profile";
import { PlanCard } from "../plans/plan-card";

export default async function DashboardContent() {
  const { profile } = await requireCompletedProfile();

  const grade =
    GRADE_LABELS[
      profile.gradeLevel as keyof typeof GRADE_LABELS
    ] ?? profile.gradeLevel;

  const [subjects, assignments] = await Promise.all([
    prisma.subject.findMany({
      where: {
        isActive: true,
        children: {
          none: {
            isActive: true,
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        parent: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            categories: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    }),

    getStudentAssignments(profile.id),
  ]);

  // Separate unfinished plans from completed plans.
  const active = assignments.filter((a) => !a.completedAt);
  const completed = assignments.filter((a) => a.completedAt);

  // Find the first active plan that the student can start or continue.
  const resumable = active.find((a) => !a.startsInFuture);

  const overdueCount = active.filter((a) => a.isOverdue).length;

  // Count active plans for each subject.
  const assignedBySubject = new Map<string, number>();

  for (const assignment of active) {
    assignedBySubject.set(
      assignment.subjectId,
      (assignedBySubject.get(assignment.subjectId) ?? 0) + 1,
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 p-8">
      {/* Welcome header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, {profile.firstName ?? "student"}
          </h1>

          <p className="text-gray-600">{grade}</p>
        </div>

        {resumable && (
          <Link
            href={`/plans/${resumable.id}`}
            className="rounded bg-black px-4 py-2 text-white"
          >
            {resumable.doneItems > 0 ? "Continue" : "Start"}:{" "}
            {resumable.planTitle}
          </Link>
        )}
      </header>

      {/* Plan statistics */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-2xl font-bold">{active.length}</p>
          <p className="text-sm text-gray-600">Current plans</p>
        </div>

        <div className="rounded border p-4">
          <p
            className={`text-2xl font-bold ${
              overdueCount > 0 ? "text-red-700" : ""
            }`}
          >
            {overdueCount}
          </p>
          <p className="text-sm text-gray-600">Overdue</p>
        </div>

        <div className="rounded border p-4">
          <p className="text-2xl font-bold">{completed.length}</p>
          <p className="text-sm text-gray-600">Completed plans</p>
        </div>
      </section>

      {/* Assigned work */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Assigned work</h2>

          <Link href="/plans" className="text-sm underline">
            View all plans
          </Link>
        </div>

        {active.length === 0 ? (
          <p className="rounded border border-dashed p-6 text-gray-500">
            Nothing is assigned to you right now. New work will appear here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active
              .slice(0, 4)
              .map((assignment) => (
                <PlanCard key={assignment.id} plan={assignment} />
              ))}
          </div>
        )}
      </section>

      {/* Subjects */}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Your subjects</h2>

        {subjects.length === 0 ? (
          <p className="rounded border border-dashed p-6 text-gray-500">
            No subjects are available yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => {
              const assigned = assignedBySubject.get(subject.id) ?? 0;

              return (
                <article
                  key={subject.id}
                  className="rounded-lg border p-5"
                >
                  <h3 className="text-lg font-semibold">
                    {subject.parent
                      ? `${subject.parent.name} ${subject.name}`
                      : subject.name}
                  </h3>

                  {subject.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {subject.description}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-gray-500">
                    {subject._count.categories} topics
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {assigned > 0
                      ? `${assigned} current plan${
                          assigned === 1 ? "" : "s"
                        } assigned`
                      : "No plans assigned yet."}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
