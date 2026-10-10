
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import  prisma  from "@/lib/prisma";
import {
  createCategory,
  updateCategory,
  setCategoryActive,
} from "./actions";

type Props = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function AdminCategoriesContent({
  searchParams,
}: Props) {
  // SECURITY: verify the current user is an admin on the server.
  await requireAdmin();

  // Resolve request-specific URL parameters inside Suspense.
  const { error, saved } = await searchParams;

  const subjects = await prisma.subject.findMany({
    where: {
      isActive: true,
      children: {
        none: { isActive: true },
      },
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      parent: {
        select: { name: true },
      },
      categories: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          sortOrder: true,
          isActive: true,
        },
      },
    },
  });

  const label = (subject: {
    name: string;
    parent: { name: string } | null;
  }) =>
    subject.parent
      ? `${subject.parent.name} ${subject.name}`
      : subject.name;

  const input = "rounded border px-2 py-1";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Link href="/admin" className="text-sm underline">
          Back to admin
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
        <h2 className="mb-3 text-lg font-semibold">
          Add a category
        </h2>

        <form
          action={createCategory}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="subjectId"
              className="text-sm font-medium"
            >
              Subject
            </label>

            <select
              id="subjectId"
              name="subjectId"
              required
              className={input}
              defaultValue=""
            >
              <option value="" disabled>
                Select...
              </option>

              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {label(subject)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="name"
              className="text-sm font-medium"
            >
              Name
            </label>

            <input
              id="name"
              name="name"
              required
              maxLength={80}
              className={input}
            />
          </div>

          <button
            type="submit"
            className="rounded bg-black px-4 py-1.5 text-white"
          >
            Add
          </button>
        </form>
      </section>

      {subjects.map((subject) => (
        <section key={subject.id}>
          <h2 className="mb-2 text-lg font-semibold">
            {label(subject)}
          </h2>

          {subject.categories.length === 0 ? (
            <p className="rounded border border-dashed p-4 text-sm text-gray-500">
              No categories yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {subject.categories.map((category) => (
                <li
                  key={category.id}
                  className={`flex flex-wrap items-center gap-3 rounded border p-3 ${
                    category.isActive
                      ? ""
                      : "bg-gray-50 opacity-70"
                  }`}
                >
                  <form
                    action={updateCategory}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={category.id}
                    />

                    <input
                      name="name"
                      defaultValue={category.name}
                      required
                      maxLength={80}
                      aria-label="Category name"
                      className={input}
                    />

                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      max={10000}
                      defaultValue={category.sortOrder}
                      aria-label="Display order"
                      className={`${input} w-24`}
                    />

                    <button
                      type="submit"
                      className="rounded border px-3 py-1 text-sm"
                    >
                      Save
                    </button>
                  </form>

                  <form action={setCategoryActive}>
                    <input
                      type="hidden"
                      name="id"
                      value={category.id}
                    />

                    <input
                      type="hidden"
                      name="active"
                      value={category.isActive ? "false" : "true"}
                    />

                    <button
                      type="submit"
                      className="rounded border px-3 py-1 text-sm"
                    >
                      {category.isActive ? "Archive" : "Restore"}
                    </button>
                  </form>

                  {!category.isActive && (
                    <span className="text-xs text-gray-500">
                      Archived
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
