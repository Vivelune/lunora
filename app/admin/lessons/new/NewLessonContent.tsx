
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LessonForm } from "../lesson-form";

export default async function NewLessonContent() {
  // Verify admin access on the server.
  await requireAdmin();

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
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const options = subjects.map((subject) => ({
    id: subject.id,
    label: subject.parent
      ? `${subject.parent.name} ${subject.name}`
      : subject.name,
    categories: subject.categories,
  }));

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New lesson</h1>

        <Link
          href="/admin/lessons"
          className="text-sm underline"
        >
          Back to lessons
        </Link>
      </header>

      <LessonForm subjects={options} />
    </main>
  );
}
