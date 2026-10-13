import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isQuestionType } from "@/lib/question-input";
import prisma from "@/lib/prisma";
import { QuestionForm } from "../question-form";

export default async function NewQuestionContent({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAdmin();

  const { examId } = await params;
  const { type } = await searchParams;

  if (!type || !isQuestionType(type)) {
    notFound();
  }

  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      versions: {
        some: {
          publishedAt: null,
        },
      },
    },
    select: {
      id: true,
      title: true,
      subjectId: true,
    },
  });

  if (!exam) {
    notFound();
  }

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

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          New question - {exam.title}
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
        type={type}
        categories={categories}
      />
    </main>
  );
}