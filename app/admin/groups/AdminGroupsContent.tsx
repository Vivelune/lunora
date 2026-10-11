
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createGroup } from "./actions";

export default async function AdminGroupsContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const { error, saved } = await searchParams;

  const groups = await prisma.studentGroup.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      _count: {
        select: { memberships: true },
      },
    },
  });

  const input = "rounded border px-3 py-2";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Student groups</h1>
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
        <h2 className="mb-3 text-lg font-semibold">Create a group</h2>

        <form
          action={createGroup}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium">
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

          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor="description"
              className="text-sm font-medium"
            >
              Description (optional)
            </label>
            <input
              id="description"
              name="description"
              maxLength={300}
              className={`${input} w-full`}
            />
          </div>

          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white"
          >
            Create
          </button>
        </form>
      </section>

      {groups.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-gray-500">
          No groups yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li
              key={group.id}
              className={`flex items-center justify-between rounded border p-3 ${
                group.isActive ? "" : "bg-gray-50 opacity-70"
              }`}
            >
              <div>
                <Link
                  href={`/admin/groups/${group.id}`}
                  className="font-medium underline"
                >
                  {group.name}
                </Link>

                {group.description && (
                  <p className="text-sm text-gray-600">
                    {group.description}
                  </p>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {group._count.memberships} student
                {group._count.memberships === 1 ? "" : "s"}
                {!group.isActive && " - archived"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
