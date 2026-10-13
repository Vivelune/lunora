import Link from "next/link";
import { QUESTION_TYPES, TYPE_LABELS } from "@/lib/question-input";
import { formatHundredths, toHundredths } from "@/lib/points";
import prisma from "@/lib/prisma";
import { deleteQuestion, moveQuestion } from "../question-actions";

export default async function QuestionsSectionContent({
  examId,
}: {
  examId: string;
}) {
  const versions = await prisma.examVersion.findMany({
    where: { examId },
    orderBy: { versionNumber: "desc" },
    take: 2,
    select: {
      id: true,
      versionNumber: true,
      publishedAt: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          prompt: true,
          points: true,
          acceptedAnswers: true,
          category: {
            select: {
              name: true,
            },
          },
          options: {
            orderBy: { position: "asc" },
            select: {
              text: true,
              isCorrect: true,
            },
          },
        },
      },
    },
  });

  const working =
    versions.find((version) => version.publishedAt === null) ?? null;

  const shown = working ?? versions[0] ?? null;
  const editable = working !== null;
  const questions = shown?.questions ?? [];

  const totalHundredths = questions.reduce(
    (sum, question) =>
      sum + toHundredths(question.points.toString()),
    0,
  );

  return (
    <section
      id="questions"
      className="flex flex-col gap-4 rounded-lg border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Questions</h2>

        <p className="text-sm text-gray-600">
          {questions.length} question
          {questions.length === 1 ? "" : "s"} -{" "}
          {formatHundredths(totalHundredths)} points in total
        </p>
      </div>

      {questions.length === 0 ? (
        <p className="rounded border border-dashed p-4 text-sm text-gray-500">
          No questions yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {questions.map((question, index) => (
            <li
              key={question.id}
              className="flex flex-col gap-2 rounded border p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {index + 1}.{" "}
                    {question.prompt.length > 140
                      ? `${question.prompt.slice(0, 140)}...`
                      : question.prompt}
                  </p>

                  <p className="text-xs text-gray-500">
                    {TYPE_LABELS[question.type]} -{" "}
                    {formatHundredths(
                      toHundredths(question.points.toString()),
                    )}{" "}
                    pt
                    {question.category &&
                      ` - ${question.category.name}`}
                  </p>
                </div>

                {editable && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <form action={moveQuestion}>
                      <input
                        type="hidden"
                        name="examId"
                        value={examId}
                      />
                      <input
                        type="hidden"
                        name="questionId"
                        value={question.id}
                      />
                      <input
                        type="hidden"
                        name="direction"
                        value="up"
                      />
                      <button
                        type="submit"
                        disabled={index === 0}
                        className="rounded border px-2 py-1 disabled:opacity-40"
                      >
                        Up
                      </button>
                    </form>

                    <form action={moveQuestion}>
                      <input
                        type="hidden"
                        name="examId"
                        value={examId}
                      />
                      <input
                        type="hidden"
                        name="questionId"
                        value={question.id}
                      />
                      <input
                        type="hidden"
                        name="direction"
                        value="down"
                      />
                      <button
                        type="submit"
                        disabled={index === questions.length - 1}
                        className="rounded border px-2 py-1 disabled:opacity-40"
                      >
                        Down
                      </button>
                    </form>

                    <Link
                      href={`/admin/exams/${examId}/questions/${question.id}`}
                      className="rounded border px-2 py-1"
                    >
                      Edit
                    </Link>

                    <form action={deleteQuestion}>
                      <input
                        type="hidden"
                        name="examId"
                        value={examId}
                      />
                      <input
                        type="hidden"
                        name="questionId"
                        value={question.id}
                      />
                      <button
                        type="submit"
                        className="rounded border px-2 py-1 text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {question.type === "SHORT_ANSWER" ? (
                <p className="text-xs text-gray-600">
                  Accepted: {question.acceptedAnswers.join(" | ")}
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5 text-xs">
                  {question.options.map((option, optionIndex) => (
                    <li
                      key={optionIndex}
                      className={
                        option.isCorrect
                          ? "font-medium text-green-700"
                          : "text-gray-600"
                      }
                    >
                      {option.isCorrect ? "[correct] " : "[ ] "}
                      {option.text}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-sm">
          <span className="font-medium">Add:</span>

          {QUESTION_TYPES.map((type) => (
            <Link
              key={type}
              href={`/admin/exams/${examId}/questions/new?type=${type}`}
              className="rounded border px-3 py-1"
            >
              {TYPE_LABELS[type]}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}