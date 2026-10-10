import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma  from "@/lib/prisma";
export const instant = false;
export default async function AdminSubjectsPage() {
  await requireAdmin();

  const subjects = await prisma.subject.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      parent: { select: { name: true } },
      _count: { select: { categories: true } },
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

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Subject</th>
            <th>Slug</th>
            <th>Categories</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-2">
                {s.parent ? `${s.parent.name} - ${s.name}` : s.name}
              </td>
              <td className="text-gray-600">{s.slug}</td>
              <td>{s._count.categories}</td>
              <td>{s.isActive ? "Active" : "Archived"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}