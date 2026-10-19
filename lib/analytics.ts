import "server-only";
import prisma from "./prisma";
import { toHundredths } from "./points";
import { releaseFromRow } from "./results-release";
import type { AnswerFact, AttemptFact } from "./analytics-core";

/**
 * Graded attempts as plain facts. With releasedOnly, an attempt whose results are not
 * released is dropped here, so nothing about it can reach a student-facing page.
 */
export async function loadAttemptFacts(options: {
  studentId?: string;
  studentIds?: string[];
  releasedOnly: boolean;
  
}): Promise<AttemptFact[]> {
  const rows = await prisma.examAttempt.findMany({
    where: {
      status: "GRADED",
      pointsEarned: { not: null },
      pointsPossible: { gt: 0 },
      ...(options.studentId ? { studentId: options.studentId } : {}),
      ...(options.studentIds ? { studentId: { in: options.studentIds } } : {}),
    },
    select: {
      id: true,
      studentId: true,
      examId: true,
      assignmentId: true,
      startedAt: true,
      submittedAt: true,
      gradedAt: true,
      pointsEarned: true,
      pointsPossible: true,
      resultsReleasedAt: true,
      explanationsReleasedAt: true,
      version: { select: { resultRelease: true, explanationRelease: true, durationMinutes: true } },
      assignment: { select: { dueDate: true } },
      exam: {
        select: {
          title: true,
          availableUntil: true,
          subjectId: true,
          subject: { select: { name: true, parent: { select: { name: true } } } },
        },
      },
    },
  });

  const now = new Date();
  const facts: AttemptFact[] = [];

  for (const row of rows) {
    if (options.releasedOnly && !releaseFromRow(row, now).resultsReleased) continue;
    if (row.pointsEarned === null || row.pointsPossible === null) continue;

    facts.push({
      attemptId: row.id,
      studentId: row.studentId,
      examId: row.examId,
      examTitle: row.exam.title,
      subjectId: row.exam.subjectId,
      subjectName: row.exam.subject.parent
        ? `${row.exam.subject.parent.name} ${row.exam.subject.name}`
        : row.exam.subject.name,
      assigned: row.assignmentId !== null,
      endedAt: row.submittedAt ?? row.gradedAt ?? row.startedAt,
      earnedHundredths: toHundredths(row.pointsEarned.toString()),
      possibleHundredths: toHundredths(row.pointsPossible.toString()),
    });
  }
  return facts;
}

/** Graded answers (with their topic) for the given attempts. Only call this with attempts the viewer may see. */
export async function loadTopicAnswers(attemptIds: string[]): Promise<AnswerFact[]> {
  if (attemptIds.length === 0) return [];

  const rows = await prisma.attemptAnswer.findMany({
    where: { attemptId: { in: attemptIds }, question: { categoryId: { not: null } } },
    select: {
      attemptId: true,
      pointsAwarded: true,
      question: {
        select: { points: true, categoryId: true, category: { select: { name: true, subjectId: true } } },
      },
    },
  });

  const facts: AnswerFact[] = [];
  for (const row of rows) {
    const { categoryId, category } = row.question;
    if (!categoryId || !category) continue;
    facts.push({
      attemptId: row.attemptId,
      categoryId,
      categoryName: category.name,
      subjectId: category.subjectId,
      awardedHundredths: row.pointsAwarded ? toHundredths(row.pointsAwarded.toString()) : 0,
      possibleHundredths: toHundredths(row.question.points.toString()),
    });
  }
  return facts;
}