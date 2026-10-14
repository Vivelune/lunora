"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { copyVersionContent } from "@/lib/exam-copy";
import { getPublishProblems } from "@/lib/exam-validation";
import prisma  from "@/lib/prisma";

const examUrl = (id: string) => `/admin/exams/${id}`;

function go(path: string, kind: "error" | "saved", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

function refresh(examId: string) {
  revalidatePath("/admin/exams");
  revalidatePath(examUrl(examId));
}

export async function publishExam(formData: FormData) {
  const { profile } = await requireAdmin();

  const examId = str(formData, "examId");
  if (!examId) go("/admin/exams", "error", "Invalid request");
  const base = examUrl(examId);

  const version = await prisma.examVersion.findFirst({
    where: { examId, publishedAt: null },
    select: { id: true, versionNumber: true, exam: { select: { status: true } } },
  });
  if (!version) {
    go(base, "error", "There is no editable version to publish");
  }
  if (version.exam.status === "ARCHIVED") {
    go(base, "error", "Restore the exam before publishing");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const problems = await getPublishProblems(version.id, tx);
      if (problems.length > 0) throw new Error("PROBLEMS");

      const result = await tx.examVersion.updateMany({
        where: { id: version.id, publishedAt: null },
        data: { publishedAt: new Date() },
      });
      if (result.count === 0) throw new Error("ALREADY_PUBLISHED");

      await tx.exam.update({ where: { id: examId }, data: { status: "PUBLISHED" } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROBLEMS") {
      go(base, "error", "This exam cannot be published yet. Fix the problems in the publish checklist.");
    }
    if (error instanceof Error && error.message === "ALREADY_PUBLISHED") {
      go(base, "error", "This version was already published. Reload the page.");
    }
    console.error("publishExam failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not publish. Nothing was changed. Please try again.");
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "exam.publish",
    entityType: "Exam",
    entityId: examId,
    details: { versionNumber: version.versionNumber },
  });

  refresh(examId);
  go(base, "saved", `Version ${version.versionNumber} published and frozen`);
}

export async function startNewExamVersion(formData: FormData) {
  const { profile } = await requireAdmin();

  const examId = str(formData, "examId");
  if (!examId) go("/admin/exams", "error", "Invalid request");
  const base = examUrl(examId);

  let newVersionNumber = 0;
  try {
    await prisma.$transaction(
      async (tx) => {
        const exam = await tx.exam.findUnique({ where: { id: examId }, select: { status: true } });
        if (!exam) throw new Error("NO_EXAM");
        if (exam.status === "ARCHIVED") throw new Error("ARCHIVED");

        const latest = await tx.examVersion.findFirst({
          where: { examId },
          orderBy: { versionNumber: "desc" },
        });
        if (!latest) throw new Error("NO_VERSION");
        if (!latest.publishedAt) throw new Error("ALREADY_EDITING");

        const created = await tx.examVersion.create({
          data: {
            examId,
            versionNumber: latest.versionNumber + 1,
            instructions: latest.instructions,
            durationMinutes: latest.durationMinutes,
            maxAttempts: latest.maxAttempts,
            passingPercent: latest.passingPercent,
            shuffleQuestions: latest.shuffleQuestions,
            shuffleOptions: latest.shuffleOptions,
            resultRelease: latest.resultRelease,
            explanationRelease: latest.explanationRelease,
            focusPolicy: latest.focusPolicy,
            maxFocusViolations: latest.maxFocusViolations,
            requireFullscreen: latest.requireFullscreen,
          },
          select: { id: true, versionNumber: true },
        });
        newVersionNumber = created.versionNumber;

        await copyVersionContent(tx, latest.id, created.id);
      },
      { timeout: 30000, maxWait: 10000 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ARCHIVED") {
      go(base, "error", "Restore the exam before creating a new version");
    }
    if (error instanceof Error && error.message === "ALREADY_EDITING") {
      go(base, "error", "This exam already has an editable version");
    }
    if (errorCode(error) === "P2002") {
      go(base, "error", "Another admin just started a new version. Reload the page.");
    }
    console.error("startNewExamVersion failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not create a new version. Nothing was changed. Please try again.");
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "exam.new_version",
    entityType: "Exam",
    entityId: examId,
    details: { versionNumber: newVersionNumber },
  });

  refresh(examId);
  go(base, "saved", `Version ${newVersionNumber} created from the previous version. Edit it, then publish.`);
}

export async function duplicateExam(formData: FormData) {
    const { profile } = await requireAdmin();
  
    const examId = str(formData, "examId");
  
    if (!examId) {
      go("/admin/exams", "error", "Invalid request");
    }
  
    const base = examUrl(examId);
  
    let newExamId: string;
  
    try {
      newExamId = await prisma.$transaction(
        async (tx) => {
          const exam = await tx.exam.findUnique({
            where: { id: examId },
            select: {
              title: true,
              description: true,
              subjectId: true,
              categoryId: true,
            },
          });
  
          if (!exam) {
            throw new Error("NO_EXAM");
          }
  
          const latest = await tx.examVersion.findFirst({
            where: { examId },
            orderBy: { versionNumber: "desc" },
          });
  
          if (!latest) {
            throw new Error("NO_VERSION");
          }
  
          const copy = await tx.exam.create({
            data: {
              title: `Copy of ${exam.title}`.slice(0, 150),
              description: exam.description,
              subjectId: exam.subjectId,
              categoryId: exam.categoryId,
              createdById: profile.id,
              versions: {
                create: {
                  versionNumber: 1,
                  instructions: latest.instructions,
                  durationMinutes: latest.durationMinutes,
                  maxAttempts: latest.maxAttempts,
                  passingPercent: latest.passingPercent,
                  shuffleQuestions: latest.shuffleQuestions,
                  shuffleOptions: latest.shuffleOptions,
                  resultRelease: latest.resultRelease,
                  explanationRelease: latest.explanationRelease,
                  focusPolicy: latest.focusPolicy,
                  maxFocusViolations: latest.maxFocusViolations,
                  requireFullscreen: latest.requireFullscreen,
                },
              },
            },
            select: {
              id: true,
              versions: {
                select: { id: true },
              },
            },
          });
  
          const copiedVersion = copy.versions[0];
  
          if (!copiedVersion) {
            throw new Error("NO_COPIED_VERSION");
          }
  
          await copyVersionContent(
            tx,
            latest.id,
            copiedVersion.id,
          );
  
          return copy.id;
        },
        { timeout: 30000, maxWait: 10000 },
      );
    } catch (error) {
      if (error instanceof Error && error.message === "NO_EXAM") {
        go("/admin/exams", "error", "That exam no longer exists");
      }
  
      if (error instanceof Error && error.message === "NO_VERSION") {
        go(base, "error", "This exam has no version to duplicate");
      }
  
      console.error(
        "duplicateExam failed:",
        error instanceof Error ? error.message : "unknown error",
      );
  
      go(
        base,
        "error",
        "Could not duplicate the exam. Nothing was changed. Please try again.",
      );
    }
  
    await writeAuditLog({
      actorId: profile.id,
      action: "exam.duplicate",
      entityType: "Exam",
      entityId: newExamId,
      details: { copiedFromExamId: examId },
    });
  
    revalidatePath("/admin/exams");
  
    go(
      examUrl(newExamId),
      "saved",
      "Exam duplicated as a draft. Review the copy.",
    );
  }

export async function setExamLive(formData: FormData) {
  const { profile } = await requireAdmin();

  const examId = str(formData, "examId");
  const live = str(formData, "live") === "true";
  if (!examId) go("/admin/exams", "error", "Invalid request");
  const base = examUrl(examId);

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { status: true, versions: { where: { publishedAt: { not: null } }, select: { id: true }, take: 1 } },
  });
  if (!exam) {
    go("/admin/exams", "error", "That exam no longer exists");
  }
  if (exam.status === "ARCHIVED") {
    go(base, "error", "Restore the exam first");
  }

  if (live) {
    if (exam.versions.length === 0) {
      go(base, "error", "Publish a version before making the exam live");
    }
    await prisma.exam.update({ where: { id: examId }, data: { status: "PUBLISHED" } });
  } else {
    await prisma.exam.update({ where: { id: examId }, data: { status: "DRAFT" } });
  }

  await writeAuditLog({
    actorId: profile.id,
    action: live ? "exam.make_live" : "exam.unpublish",
    entityType: "Exam",
    entityId: examId,
  });

  refresh(examId);
  go(
    base,
    "saved",
    live ? "The exam is live again" : "The exam is no longer live. No new attempts can start until it is made live again."
  );
}