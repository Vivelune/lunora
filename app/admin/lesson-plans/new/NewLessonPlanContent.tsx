
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createPlan } from "../actions";

export default async function NewLessonPlanContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();

  const { error } = await searchParams;

  const subjects = await prisma.subject.findMany({
    where: {
      isActive: true,
      children: { none: {} },
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      parent: {
        select: { name: true },
      },
    },
  });

  const field = "w-full rounded border px-3 py-2";

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">New lesson plan</h1>

        <Link
          href="/admin/lesson-plans"
          className="text-sm underline"
        >
          Back to plans
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

      {subjects.length === 0 ? (
        <div className="rounded border border-dashed p-4 text-sm text-gray-600">
          No active subjects are available. Create or activate a subject
          before creating a lesson plan.
          <div className="mt-3">
            <Link href="/admin/subjects" className="underline">
              Manage subjects
            </Link>
          </div>
        </div>
      ) : (
        <form action={createPlan} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="title"
              className="mb-1 block text-sm font-medium"
            >
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              maxLength={150}
              className={field}
            />
          </div>

          <div>
            <label
              htmlFor="subjectId"
              className="mb-1 block text-sm font-medium"
            >
              Subject (cannot be changed later)
            </label>
            <select
              id="subjectId"
              name="subjectId"
              required
              defaultValue=""
              className={field}
            >
              <option value="" disabled>
                Select...
              </option>

              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.parent
                    ? `${subject.parent.name} ${subject.name}`
                    : subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={500}
              className={field}
            />
          </div>

          <button
            type="submit"
            className="self-start rounded bg-black px-5 py-2 text-white"
          >
            Create plan
          </button>
        </form>
      )}
    </main>
  );
}