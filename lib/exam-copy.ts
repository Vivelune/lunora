import "server-only";
import prisma from "./prisma";

type Db = Pick<typeof prisma, "question" | "answerOption">;

/** Copies every question and option from one exam version to another. Returns how many questions were copied. */
export async function copyVersionContent(db: Db, fromVersionId: string, toVersionId: string): Promise<number> {
  const source = await db.question.findMany({
    where: { versionId: fromVersionId },
    orderBy: { position: "asc" },
    select: {
      position: true,
      type: true,
      prompt: true,
      points: true,
      explanation: true,
      categoryId: true,
      acceptedAnswers: true,
      options: {
        orderBy: { position: "asc" },
        select: { position: true, text: true, isCorrect: true },
      },
    },
  });

  if (source.length === 0) {
    return 0;
  }

  const created = await db.question.createManyAndReturn({
    data: source.map((q) => ({
      versionId: toVersionId,
      position: q.position,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      explanation: q.explanation,
      categoryId: q.categoryId,
      acceptedAnswers: q.acceptedAnswers,
    })),
    select: { id: true, position: true },
  });

  const idByPosition = new Map(created.map((c) => [c.position, c.id]));

  const options = source.flatMap((q) => {
    const questionId = idByPosition.get(q.position);
    if (!questionId) return [];
    return q.options.map((o) => ({
      questionId,
      position: o.position,
      text: o.text,
      isCorrect: o.isCorrect,
    }));
  });

  if (options.length > 0) {
    await db.answerOption.createMany({ data: options });
  }

  return source.length;
}