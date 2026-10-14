import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { QuestionForm } from "../question-form";
import { TYPE_LABELS } from "@/lib/question-input";

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Exam · Question
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Edit question
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {exam.title}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-300">
            {TYPE_LABELS[question.type]}
          </span>
        </div>
      </header>

      {/* ============ FORM ============ */}
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

      {/* ============ BACK LINK ============ */}
      <Link
        href={`/admin/exams/${exam.id}#questions`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5"
        >
          <path
            d="M13 8H3m0 0 4-4M3 8l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to exam
      </Link>
    </div>
  );
}