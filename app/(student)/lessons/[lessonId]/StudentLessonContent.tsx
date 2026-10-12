
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { getLessonForStudent } from "@/lib/lesson-access";
import {
  computeItemStates,
  type ItemState,
} from "@/lib/plan-progress";
import prisma  from "@/lib/prisma";

import { completeItem } from "../../plans/actions";
import { Markdown } from "@/app/components/markdown";

type StudentLessonContentProps = {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ assignment?: string }>;
};

export default async function StudentLessonContent({
  params,
  searchParams,
}: StudentLessonContentProps) {
  const { profile } = await requireCompletedProfile();
  const { lessonId } = await params;
  const { assignment: assignmentId } = await searchParams;

  const lesson = await getLessonForStudent(lessonId, profile.id);

  // Same 404 for missing, draft, archived, locked,
  // and unassigned lessons.
  if (!lesson) {
    notFound();
  }

  let completion: {
    assignmentId: string;
    itemId: string;
    state: ItemState;
  } | null = null;

  if (assignmentId) {
    const assignment =
      await prisma.lessonPlanAssignment.findFirst({
        where: {
          id: assignmentId,
          studentId: profile.id,
          status: "ACTIVE",
        },
        select: {
          id: true,
          version: {
            select: {
              items: {
                orderBy: { position: "asc" },
                select: {
                  id: true,
                  isRequired: true,
                  lessonId: true,
                },
              },
            },
          },
          progress: {
            select: { itemId: true },
          },
        },
      });

    if (assignment) {
      const states = computeItemStates(
        assignment.version.items,
        new Set(assignment.progress.map((p) => p.itemId)),
      );

      const item = assignment.version.items.find(
        (i) => i.lessonId === lesson.id,
      );

      if (item) {
        completion = {
          assignmentId: assignment.id,
          itemId: item.id,
          state: states.get(item.id) ?? "LOCKED",
        };
      }
    }
  }

  const subject = lesson.subject.parent
    ? `${lesson.subject.parent.name} ${lesson.subject.name}`
    : lesson.subject.name;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      {completion && (
        <Link
          href={`/plans/${completion.assignmentId}`}
          className="text-sm underline"
        >
          Back to your plan
        </Link>
      )}

      <header>
        <p className="text-sm text-gray-500">
          {subject}
          {lesson.category && ` - ${lesson.category.name}`}
        </p>

        <h1 className="text-3xl font-bold">{lesson.title}</h1>

        {lesson.description && (
          <p className="mt-2 text-gray-600">
            {lesson.description}
          </p>
        )}

        {lesson.estimatedMinutes && (
          <p className="mt-1 text-sm text-gray-500">
            About {lesson.estimatedMinutes} minutes
          </p>
        )}
      </header>

      {lesson.objectives.length > 0 && (
        <section className="rounded border p-4">
          <h2 className="mb-2 font-semibold">
            Learning objectives
          </h2>

          <ul className="list-disc pl-6">
            {lesson.objectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
        </section>
      )}

      <Markdown>{lesson.content}</Markdown>

      {lesson.resources.length > 0 && (
        <section className="rounded border p-4">
          <h2 className="mb-2 font-semibold">Materials</h2>

          <ul className="flex flex-col gap-1 text-sm">
            {lesson.resources.map((resource) => (
              <li key={resource.id}>
                <a
                  href={`/api/resources/${resource.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {completion?.state === "AVAILABLE" && (
        <form action={completeItem} className="border-t pt-6">
          <input
            type="hidden"
            name="assignmentId"
            value={completion.assignmentId}
          />

          <input
            type="hidden"
            name="itemId"
            value={completion.itemId}
          />

          <button
            type="submit"
            className="rounded bg-black px-5 py-2 text-white"
          >
            Mark lesson complete
          </button>
        </form>
      )}

      {completion?.state === "COMPLETED" && (
        <p className="border-t pt-6 text-sm text-green-700">
          You have completed this lesson.
        </p>
      )}
    </main>
  );
}
