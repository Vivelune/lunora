
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  addItem,
  moveItem,
  publishPlan,
  removeItem,
  setPlanArchived,
  startNewVersion,
  toggleRequired,
  updatePlan,
} from "../actions";

export default async function EditLessonPlanContent({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const { planId } = await params;
  const { error, saved } = await searchParams;

  const plan = await prisma.lessonPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      title: true,
      description: true,
      objectives: true,
      status: true,
      subjectId: true,
      categoryId: true,
      subject: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          publishedAt: true,
          items: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
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
    },
  });

  if (!plan) {
    notFound();
  }

  const working =
    plan.versions.find((version) => version.publishedAt === null) ?? null;

  const shown = working ?? plan.versions[0] ?? null;

  const editable = working !== null && plan.status !== "ARCHIVED";

  const usedLessonIds = (shown?.items ?? []).flatMap((item) =>
    item.lesson ? [item.lesson.id] : []
  );

  const [categories, availableLessons] = await Promise.all([
    prisma.category.findMany({
      where: {
        subjectId: plan.subjectId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),

    editable
      ? prisma.lesson.findMany({
          where: {
            subjectId: plan.subjectId,
            status: "PUBLISHED",
            id: { notIn: usedLessonIds },
          },
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
          },
        })
      : Promise.resolve([] as { id: string; title: string }[]),
  ]);

  const totalMinutes = (shown?.items ?? []).reduce(
    (sum, item) => sum + (item.lesson?.estimatedMinutes ?? 0),
    0
  );

  const field = "w-full rounded border px-3 py-2";
  const small = "rounded border px-2 py-1 text-xs";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{plan.title}</h1>

          <p className="text-sm text-gray-600">
            {plan.subject.parent
              ? `${plan.subject.parent.name} ${plan.subject.name}`
              : plan.subject.name}{" "}
            - status <strong>{plan.status}</strong>
          </p>
        </div>

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

      {saved && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700"
        >
          {saved}
        </p>
      )}

      <section className="rounded-lg border p-5">
        <h2 className="mb-3 text-lg font-semibold">Plan details</h2>

        <form action={updatePlan} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={plan.id} />

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
              defaultValue={plan.title}
              className={field}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium"
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              rows={2}
              maxLength={500}
              defaultValue={plan.description ?? ""}
              className={field}
            />
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="mb-1 block text-sm font-medium"
            >
              Category (optional)
            </label>

            <select
              id="categoryId"
              name="categoryId"
              defaultValue={plan.categoryId ?? ""}
              className={field}
            >
              <option value="">None</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="objectives"
              className="mb-1 block text-sm font-medium"
            >
              Learning objectives (one per line, up to 10)
            </label>

            <textarea
              id="objectives"
              name="objectives"
              rows={3}
              defaultValue={plan.objectives.join("\n")}
              className={field}
            />
          </div>

          <button
            type="submit"
            className="self-start rounded border px-4 py-1.5 text-sm"
          >
            Save details
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {shown
              ? `Version ${shown.versionNumber} - ${
                  working ? "editable working copy" : "published (frozen)"
                }`
              : "No version"}
          </h2>

          <p className="text-sm text-gray-500">
            Estimated time: {totalMinutes} minutes
          </p>
        </div>

        {!shown || shown.items.length === 0 ? (
          <p className="rounded border border-dashed p-4 text-sm text-gray-500">
            No lessons in this version yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {shown.items.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {index + 1}. {item.lesson?.title ?? "(missing lesson)"}
                  </span>

                  <span className="ml-2 text-gray-500">
                    {item.isRequired ? "Required" : "Optional"}
                    {item.lesson &&
                      item.lesson.status !== "PUBLISHED" &&
                      ` - lesson is ${item.lesson.status.toLowerCase()}`}
                  </span>
                </div>

                {editable && (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={moveItem}>
                      <input
                        type="hidden"
                        name="planId"
                        value={plan.id}
                      />
                      <input
                        type="hidden"
                        name="itemId"
                        value={item.id}
                      />
                      <input
                        type="hidden"
                        name="direction"
                        value="up"
                      />

                      <button
                        type="submit"
                        disabled={index === 0}
                        className={`${small} disabled:opacity-40`}
                      >
                        Up
                      </button>
                    </form>

                    <form action={moveItem}>
                      <input
                        type="hidden"
                        name="planId"
                        value={plan.id}
                      />
                      <input
                        type="hidden"
                        name="itemId"
                        value={item.id}
                      />
                      <input
                        type="hidden"
                        name="direction"
                        value="down"
                      />

                      <button
                        type="submit"
                        disabled={index === shown.items.length - 1}
                        className={`${small} disabled:opacity-40`}
                      >
                        Down
                      </button>
                    </form>

                    <form action={toggleRequired}>
                      <input
                        type="hidden"
                        name="planId"
                        value={plan.id}
                      />
                      <input
                        type="hidden"
                        name="itemId"
                        value={item.id}
                      />

                      <button type="submit" className={small}>
                        Make {item.isRequired ? "optional" : "required"}
                      </button>
                    </form>

                    <form action={removeItem}>
                      <input
                        type="hidden"
                        name="planId"
                        value={plan.id}
                      />
                      <input
                        type="hidden"
                        name="itemId"
                        value={item.id}
                      />

                      <button
                        type="submit"
                        className={`${small} text-red-700`}
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {editable && (
          <form
            action={addItem}
            className="flex flex-wrap items-end gap-3 border-t pt-4"
          >
            <input type="hidden" name="planId" value={plan.id} />

            <div className="flex flex-col gap-1">
              <label
                htmlFor="lessonId"
                className="text-sm font-medium"
              >
                Add a published lesson
              </label>

              <select
                id="lessonId"
                name="lessonId"
                required
                defaultValue=""
                className="rounded border px-3 py-2"
              >
                <option value="" disabled>
                  {availableLessons.length === 0
                    ? "No more lessons available"
                    : "Select..."}
                </option>

                {availableLessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={availableLessons.length === 0}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              Add
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          {working && plan.status !== "ARCHIVED" && (
            <form action={publishPlan}>
              <input
                type="hidden"
                name="planId"
                value={plan.id}
              />

              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-white"
              >
                Publish version {working.versionNumber}
              </button>
            </form>
          )}

          {!working && plan.status !== "ARCHIVED" && (
            <form action={startNewVersion}>
              <input
                type="hidden"
                name="planId"
                value={plan.id}
              />

              <button
                type="submit"
                className="rounded border px-4 py-2 text-sm"
              >
                Create new version to edit
              </button>
            </form>
          )}

          <form action={setPlanArchived}>
            <input
              type="hidden"
              name="planId"
              value={plan.id}
            />
            <input
              type="hidden"
              name="archive"
              value={plan.status === "ARCHIVED" ? "false" : "true"}
            />

            <button
              type="submit"
              className="rounded border px-4 py-2 text-sm"
            >
              {plan.status === "ARCHIVED"
                ? "Restore plan"
                : "Archive plan"}
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-500">
          Required items unlock in order. Optional items can be skipped.
          Published versions never change, so students already using one
          keep exactly what they were given.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Version history</h2>

        <ul className="flex flex-col gap-1 text-sm">
          {plan.versions.map((version) => (
            <li key={version.id}>
              v{version.versionNumber} - {version.items.length} item
              {version.items.length === 1 ? "" : "s"} -{" "}
              {version.publishedAt
                ? `published ${version.publishedAt.toISOString().slice(0, 10)}`
                : "editable working copy"}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
