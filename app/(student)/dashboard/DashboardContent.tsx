import { requireCompletedProfile } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GRADE_LABELS } from "@/lib/validation/profile";

export default async function DashboardContent() {
  const { profile } = await requireCompletedProfile();

  const grade =
    GRADE_LABELS[profile.gradeLevel as keyof typeof GRADE_LABELS] ??
    profile.gradeLevel;

  // Show active leaf subjects (subjects without active children).
  const subjects = await prisma.subject.findMany({
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
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 p-8">
      <header>
        <h1 className="text-3xl font-bold">
          Welcome, {profile.firstName ?? "student"}
        </h1>
        <p className="text-gray-600">{grade}</p>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Your subjects</h2>

        {subjects.length === 0 ? (
          <p className="rounded border border-dashed p-6 text-gray-500">
            No subjects are available yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
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

                <p className="mt-1 text-sm text-gray-400">
                  No lessons or exams assigned yet.
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Assigned work</h2>
        <p className="rounded border border-dashed p-6 text-gray-500">
          Nothing is assigned to you yet. Lessons and exams will appear
          here once they're assigned.
        </p>
      </section>
    </main>
  );
}