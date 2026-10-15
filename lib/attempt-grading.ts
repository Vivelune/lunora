import "server-only";
import prisma from "./prisma";
import { canTransition } from "./attempt-rules";
import { gradeQuestion, hundredthsToDecimal, totalsFor, type QuestionGrade } from "./grading";

/**
 * Grades an ended attempt from the frozen exam version and moves it to GRADED.
 * Returns true only for the call that actually graded it. Calling again, or from
 * several places at once, is safe: the status change is a compare-and-swap.
 */
export async function gradeAttemptById(attemptId: string): Promise<boolean> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { status: true, versionId: true, version: { select: { passingPercent: true } } },
  });
  if (!attempt || !canTransition(attempt.status, "GRADED")) {
    return false;
  }

  // The answer key is read here, on the server, and never leaves this function.
  const [questions, answers] = await Promise.all([
    prisma.question.findMany({
      where: { versionId: attempt.versionId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        type: true,
        points: true,
        acceptedAnswers: true,
        options: { select: { id: true, isCorrect: true } },
      },
    }),
    prisma.attemptAnswer.findMany({
      where: { attemptId },
      select: { questionId: true, selectedOptionIds: true, textAnswer: true },
    }),
  ]);

  const given = new Map(answers.map((a) => [a.questionId, a]));
  const grades: QuestionGrade[] = questions.map((q) =>
    gradeQuestion(
      {
        id: q.id,
        type: q.type,
        points: q.points.toString(),
        correctOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
        acceptedAnswers: q.acceptedAnswers,
      },
      given.get(q.id)
    )
  );
  const totals = totalsFor(grades, attempt.version.passingPercent);

  return prisma.$transaction(
    async (tx) => {
      // Only an ended attempt can be claimed, and only once. A second grader finds nothing to do.
      const claim = await tx.examAttempt.updateMany({
        where: { id: attemptId, status: { in: ["SUBMITTED", "EXPIRED"] } },
        data: {
          status: "GRADED",
          gradedAt: new Date(),
          pointsEarned: hundredthsToDecimal(totals.earnedHundredths),
          pointsPossible: hundredthsToDecimal(totals.possibleHundredths),
          percentage: hundredthsToDecimal(totals.percentageHundredths),
          passed: totals.passed,
        },
      });
      if (claim.count === 0) return false;

      // Unanswered questions get a row too, so a review always covers every question.
      const existing = new Set(answers.map((a) => a.questionId));
      const missing = grades.filter((g) => !existing.has(g.questionId));
      if (missing.length > 0) {
        await tx.attemptAnswer.createMany({
          data: missing.map((g) => ({
            attemptId,
            questionId: g.questionId,
            selectedOptionIds: [],
            isCorrect: g.correct,
            pointsAwarded: hundredthsToDecimal(g.awardedHundredths),
          })),
          skipDuplicates: true,
        });
      }

      // One update per distinct outcome, not one per question.
      const groups = new Map<string, { correct: boolean; awarded: number; ids: string[] }>();
      for (const g of grades.filter((x) => existing.has(x.questionId))) {
        const key = `${g.correct}:${g.awardedHundredths}`;
        const group = groups.get(key) ?? { correct: g.correct, awarded: g.awardedHundredths, ids: [] };
        group.ids.push(g.questionId);
        groups.set(key, group);
      }
      for (const group of groups.values()) {
        await tx.attemptAnswer.updateMany({
          where: { attemptId, questionId: { in: group.ids } },
          data: { isCorrect: group.correct, pointsAwarded: hundredthsToDecimal(group.awarded) },
        });
      }
      return true;
    },
    { timeout: 30000, maxWait: 10000 }
  );
}

/** Grades without ever throwing. A failure is logged, and the attempt is simply graded the next time it is looked at. */
export async function tryGradeAttempt(attemptId: string): Promise<boolean> {
  try {
    return await gradeAttemptById(attemptId);
  } catch (error) {
    console.error("grading failed (will retry later):", error instanceof Error ? error.name : "unknown");
    return false;
  }
}