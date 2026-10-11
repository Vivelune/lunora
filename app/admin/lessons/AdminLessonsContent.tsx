import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma  from "@/lib/prisma";

const FILTERS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export default async function AdminLessonsContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Keep authorization on the server.
  await requireAdmin();

  const { status } = await searchParams;
  const active = FILTERS.find((filter) => filter === status) ?? "ALL";

  const lessons = await prisma.lesson.findMany({
    where: active === "ALL" ? {} : { status: active },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      subject: {
        select: {
          name: true,
          parent: {
            select: { name: true },
          },
        },
      },
      category: {
        select: { name: true },
      },
    },
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lessons</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin" className="underline">
            Admin home
          </Link>

          <Link
            href="/admin/lessons/new"
            className="rounded bg-black px-3 py-1.5 text-white"
          >
            New lesson
          </Link>
        </div>
      </header>

      <nav className="flex gap-3 text-sm">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={
              filter === "ALL"
                ? "/admin/lessons"
                : `/admin/lessons?status=${filter}`
            }
            className={filter === active ? "font-bold underline" : "underline"}
          >
            {filter === "ALL"
              ? "All"
              : filter.charAt(0) + filter.slice(1).toLowerCase()}
          </Link>
        ))}
      </nav>

      {lessons.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-gray-500">
          No lessons here yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4">Title</th>
                <th className="pr-4">Subject</th>
                <th className="pr-4">Category</th>
                <th className="pr-4">Status</th>
                <th>Updated</th>
              </tr>
            </thead>

            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="border-b">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/lessons/${lesson.id}`}
                      className="underline"
                    >
                      {lesson.title}
                    </Link>
                  </td>

                  <td className="pr-4">
                    {lesson.subject.parent
                      ? `${lesson.subject.parent.name} ${lesson.subject.name}`
                      : lesson.subject.name}
                  </td>

                  <td className="pr-4">{lesson.category?.name ?? "-"}</td>
                  <td className="pr-4">{lesson.status}</td>
                  <td>{lesson.updatedAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}