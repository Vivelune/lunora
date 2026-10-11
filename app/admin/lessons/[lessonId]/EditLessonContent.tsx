import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LessonForm } from "../lesson-form";
import { setLessonStatus } from "../actions";

const STATUS_ACTIONS: Record<
  string,
  { to: string; label: string }[]
> = {
  DRAFT: [
    { to: "PUBLISHED", label: "Publish" },
    { to: "ARCHIVED", label: "Archive" },
  ],
  PUBLISHED: [
    { to: "DRAFT", label: "Unpublish (back to draft)" },
    { to: "ARCHIVED", label: "Archive" },
  ],
  ARCHIVED: [
    { to: "DRAFT", label: "Restore as draft" },
  ],
};

type Props = {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function EditLessonContent({
  params,
  searchParams,
}: Props) {
  // Server-side authorization.
  await requireAdmin();

  const [{ lessonId }, { error, saved }] = await Promise.all([
    params,
    searchParams,
  ]);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    notFound();
  }

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

  const statusActions = STATUS_ACTIONS[lesson.status] ?? [];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Edit lesson</h1>
          <p className="text-sm text-gray-600">
            Status: <strong>{lesson.status}</strong>
            {lesson.publishedAt &&
              ` - first published ${lesson.publishedAt
                .toISOString()
                .slice(0, 10)}`}
          </p>
        </div>

        <Link href="/admin/lessons" className="text-sm underline">
          Back to lessons
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

      <section className="flex flex-wrap gap-2">
        {statusActions.map((action) => (
          <form key={action.to} action={setLessonStatus}>
            <input type="hidden" name="id" value={lesson.id} />
            <input type="hidden" name="to" value={action.to} />
            <button
              type="submit"
              className="rounded border px-3 py-1.5 text-sm"
            >
              {action.label}
            </button>
          </form>
        ))}
      </section>

      <LessonForm
        subjects={options}
        lesson={{
          id: lesson.id,
          title: lesson.title,
          description: lesson.description ?? "",
          subjectId: lesson.subjectId,
          categoryId: lesson.categoryId ?? "",
          objectives: lesson.objectives.join("\n"),
          content: lesson.content,
          estimatedMinutes:
            lesson.estimatedMinutes?.toString() ?? "",
        }}
      />
    </main>
  );
}
