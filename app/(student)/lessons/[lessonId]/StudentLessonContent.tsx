import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { getLessonForStudent } from "@/lib/lesson-access";
import { Markdown } from "@/app/components/markdown";

export default async function StudentLessonContent({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { profile } = await requireCompletedProfile();
  const { lessonId } = await params;

  const lesson = await getLessonForStudent(lessonId, profile.id);

  // Use the same 404 for missing, unpublished, archived,
  // and unassigned lessons.
  if (!lesson) {
    notFound();
  }

  const subject = lesson.subject.parent
    ? `${lesson.subject.parent.name} ${lesson.subject.name}`
    : lesson.subject.name;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header>
        <p className="text-sm text-gray-500">
          {subject}
          {lesson.category && ` - ${lesson.category.name}`}
        </p>

        <h1 className="text-3xl font-bold">{lesson.title}</h1>

        {lesson.description && (
          <p className="mt-2 text-gray-600">{lesson.description}</p>
        )}

        {lesson.estimatedMinutes && (
          <p className="mt-1 text-sm text-gray-500">
            About {lesson.estimatedMinutes} minutes
          </p>
        )}
      </header>

      {lesson.objectives.length > 0 && (
        <section className="rounded border p-4">
          <h2 className="mb-2 font-semibold">Learning objectives</h2>

          <ul className="list-disc pl-6">
            {lesson.objectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
        </section>
      )}

      <Markdown>{lesson.content}</Markdown>
    </main>
  );
}