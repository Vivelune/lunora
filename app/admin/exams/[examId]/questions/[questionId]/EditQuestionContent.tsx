
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { QuestionForm } from "../question-form";

export default async function EditQuestionContent({
  params,
}: {
  params: Promise<{ examId: string; questionId: string }>;
}) {
  await requireAdmin();

  const { examId, questionId } = await params;

  // Only questions in the editable working copy can be opened for editing.
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      version: {
        examId,
        publishedAt: null,
      },
    },
    select: {
      id: true,
      type: true,
      prompt: true,
      points: true,
      explanation: true,
      categoryId: true,
      acceptedAnswers: true,
      options: {
        orderBy: { position: "asc" },
        select: {
          text: true,
          isCorrect: true,
        },
      },
      version: {
        select: {
          exam: {
            select: {
              id: true,
              title: true,
              subjectId: true,
            },
          },
        },
      },
    },
  });

  if (!question) {
    notFound();
  }

  const exam = question.version.exam;

  const categories = await prisma.category.findMany({
    where: {
      subjectId: exam.subjectId,
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const trueOption = question.options.find(
    (option) => option.text === "True",
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Edit question - {exam.title}
        </h1>

        <Link
          href={`/admin/exams/${exam.id}#questions`}
          className="text-sm underline"
        >
          Back to exam
        </Link>
      </header>

      <QuestionForm
        examId={exam.id}
        type={question.type}
        categories={categories}
        initial={{
          questionId: question.id,
          prompt: question.prompt,
          points: question.points.toString(),
          explanation: question.explanation ?? "",
          categoryId: question.categoryId ?? "",
          options: question.options.map((option) => ({
            text: option.text,
            correct: option.isCorrect,
          })),
          trueFalseCorrect:
            question.type === "TRUE_FALSE"
              ? trueOption?.isCorrect
                ? "true"
                : "false"
              : "",
          acceptedAnswers: question.acceptedAnswers.join("\n"),
        }}
      />
    </main>
  );
}
