"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import {
  START_DENIAL_MESSAGES,
  checkCanStart,
  computeDeadline,
  inProgressKey,
} from "@/lib/attempt-rules";
import { finalizeIfExpired } from "@/lib/attempts";
import { examWindow, type WindowState } from "@/lib/exam-window";
import prisma from "@/lib/prisma";

type StartContext = {
  examId: string;
  versionId: string;
  assignmentId: string | null;
  examLive: boolean;
  windowState: WindowState;
  attemptsAllowed: number;
  durationMinutes: number;
};

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

const fail = (message: string): never => redirect(`/exams?error=${encodeURIComponent(message)}`);

async function resolveContext(
  studentId: string,
  assignmentId: string,
  practiceExamId: string
): Promise<StartContext | null> {
  const now = new Date();

  if (assignmentId) {
    const a = await prisma.examAssignment.findFirst({
      where: { id: assignmentId, studentId, status: "ACTIVE" },
      select: {
        id: true,
        availableFrom: true,
        dueDate: true,
        maxAttemptsOverride: true,
        exam: { select: { id: true, status: true, availableFrom: true, availableUntil: true } },
        version: { select: { id: true, durationMinutes: true, maxAttempts: true } },
      },
    });
    if (!a) return null;
    return {
      examId: a.exam.id,
      versionId: a.version.id,
      assignmentId: a.id,
      examLive: a.exam.status === "PUBLISHED",
      windowState: examWindow({
        now,
        assignmentFrom: a.availableFrom,
        dueDate: a.dueDate,
        examFrom: a.exam.availableFrom,
        examUntil: a.exam.availableUntil,
      }).state,
      attemptsAllowed: a.maxAttemptsOverride ?? a.version.maxAttempts,
      durationMinutes: a.version.durationMinutes,
    };
  }

  if (practiceExamId) {
    const exam = await prisma.exam.findFirst({
      where: {
        id: practiceExamId,
        visibility: "OPEN_PRACTICE",
        status: "PUBLISHED",
        assignments: { none: { studentId, status: "ACTIVE" } },
      },
      select: {
        id: true,
        availableFrom: true,
        availableUntil: true,
        versions: {
          where: { publishedAt: { not: null } },
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { id: true, durationMinutes: true, maxAttempts: true },
        },
      },
    });
    const version = exam?.versions[0];
    if (!exam || !version) return null;
    return {
      examId: exam.id,
      versionId: version.id,
      assignmentId: null,
      examLive: true,
      windowState: examWindow({ now, examFrom: exam.availableFrom, examUntil: exam.availableUntil }).state,
      attemptsAllowed: version.maxAttempts,
      durationMinutes: version.durationMinutes,
    };
  }

  return null;
}

export async function startOrResumeAttempt(formData: FormData) {
  const { profile } = await requireCompletedProfile();

  const context = await resolveContext(profile.id, str(formData, "assignmentId"), str(formData, "examId"));
  if (!context) {
    fail("That exam is not available to you.");
  }
  const ctx = context as StartContext;

  // 1. Resume an attempt already in progress. This ignores the start window on purpose:
  //    the due date only limits STARTING an exam.
  const existing = await prisma.examAttempt.findFirst({
    where: { studentId: profile.id, examId: ctx.examId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (existing) {
    await finalizeIfExpired(existing.id);
    const stillActive = await prisma.examAttempt.findFirst({
      where: { id: existing.id, status: "IN_PROGRESS" },
      select: { id: true },
    });
    if (stillActive) {
      redirect(`/attempts/${stillActive.id}`);
    }
  }

  // 2. Otherwise this is a new attempt. Every rule is checked here, on the server.
  const attemptsUsed = await prisma.examAttempt.count({
    where: { studentId: profile.id, examId: ctx.examId },
  });
  const decision = checkCanStart({
    examLive: ctx.examLive,
    windowState: ctx.windowState,
    attemptsAllowed: ctx.attemptsAllowed,
    attemptsUsed,
    hasInProgress: false,
  });
  if (!decision.ok) {
    fail(START_DENIAL_MESSAGES[decision.reason]);
  }

  // 3. Create it. The unique constraints make a double-click or a second tab harmless.
  const startedAt = new Date();
  let attemptId: string | null = null;

  try {
    const last = await prisma.examAttempt.aggregate({
      where: { studentId: profile.id, examId: ctx.examId },
      _max: { attemptNumber: true },
    });

    const attempt = await prisma.examAttempt.create({
      data: {
        studentId: profile.id,
        examId: ctx.examId,
        versionId: ctx.versionId,
        assignmentId: ctx.assignmentId,
        attemptNumber: (last._max.attemptNumber ?? 0) + 1,
        startedAt,
        deadlineAt: computeDeadline(startedAt, ctx.durationMinutes),
        lastActivityAt: startedAt,
        shuffleSeed: randomInt(1, 2147483647),
        inProgressKey: inProgressKey(profile.id, ctx.examId),
        events: { create: { type: "STARTED" } },
      },
      select: { id: true },
    });
    attemptId = attempt.id;
  } catch (error) {
    if (errorCode(error) === "P2002") {
      const racing = await prisma.examAttempt.findFirst({
        where: { studentId: profile.id, examId: ctx.examId, status: "IN_PROGRESS" },
        select: { id: true },
      });
      if (racing) {
        redirect(`/attempts/${racing.id}`);
      }
      fail("Another attempt started at the same moment. Please try again.");
    }
    console.error("startOrResumeAttempt failed:", error instanceof Error ? error.name : "unknown");
    fail("Could not start the exam. Please try again.");
  }

  revalidatePath("/exams");
  redirect(`/attempts/${attemptId}`);
}