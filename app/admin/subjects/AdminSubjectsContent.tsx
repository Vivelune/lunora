
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function AdminSubjectsContent() {
  // Protect this page on the server.
  await requireAdmin();

  const subjects = await prisma.subject.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      parent: {
        select: { name: true },
      },
      _count: {
        select: { categories: true },
      },
    },
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subjects</h1>

        <Link href="/admin" className="text-sm underline">
          Back to admin
        </Link>
      </header>

      {subjects.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-sm text-gray-500">
          No subjects have been created yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4">Subject</th>
                <th className="pr-4">Slug</th>
                <th className="pr-4">Categories</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className="border-b">
                  <td className="py-2 pr-4">
                    {subject.parent
                      ? `${subject.parent.name} - ${subject.name}`
                      : subject.name}
                  </td>

                  <td className="pr-4 text-gray-600">
                    {subject.slug}
                  </td>

                  <td className="pr-4">
                    {subject._count.categories}
                  </td>

                  <td>
                    <span
                      className={
                        subject.isActive
                          ? "text-green-700"
                          : "text-gray-500"
                      }
                    >
                      {subject.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
