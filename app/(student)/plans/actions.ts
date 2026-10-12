"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { computeItemStates } from "@/lib/plan-progress";
import prisma from "@/lib/prisma";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function completeItem(formData: FormData) {
  const { profile } = await requireCompletedProfile();

  const assignmentId = str(formData, "assignmentId");
  const itemId = str(formData, "itemId");
  const planPage = `/plans/${assignmentId}`;
  const fail = (message: string): never =>
    redirect(`${planPage}?error=${encodeURIComponent(message)}`);

  if (!assignmentId || !itemId) {
    redirect("/plans");
  }

  // The assignment must belong to THIS student and still be active.
  const assignment = await prisma.lessonPlanAssignment.findFirst({
    where: { id: assignmentId, studentId: profile.id, status: "ACTIVE" },
    select: {
      startDate: true,
      version: {
        select: {
          items: {
            orderBy: { position: "asc" },
            select: { id: true, isRequired: true, lesson: { select: { status: true } } },
          },
        },
      },
      progress: { select: { itemId: true } },
    },
  });
  if (!assignment) {
    redirect("/plans");
  }

  if (assignment.startDate && assignment.startDate.getTime() > Date.now()) {
    fail("This plan has not started yet");
  }

  const items = assignment.version.items;
  const item = items.find((i) => i.id === itemId);

  if (item === undefined) {
    return fail("That item is not part of your plan");
  }

  const states = computeItemStates(items, new Set(assignment.progress.map((p) => p.itemId)));
  const state = states.get(item.id);

  if (state === "COMPLETED") {
    redirect(`${planPage}?saved=${encodeURIComponent("Already completed")}`);
  }
  if (state === "LOCKED") {
    fail("Finish the earlier required lessons first");
  }
  if (item.lesson?.status !== "PUBLISHED") {
    fail("This lesson is temporarily unavailable. Please contact your tutor.");
  }

  let planCompleted = false;
  try {
    await prisma.$transaction(async (tx) => {
      // skipDuplicates makes double-clicks and two open tabs harmless.
      await tx.lessonPlanItemProgress.createMany({
        data: [{ assignmentId, itemId }],
        skipDuplicates: true,
      });

      const done = await tx.lessonPlanItemProgress.findMany({
        where: { assignmentId },
        select: { itemId: true },
      });
      const doneIds = new Set(done.map((d) => d.itemId));

      const now = new Date();
      await tx.lessonPlanAssignment.updateMany({
        where: { id: assignmentId, startedAt: null },
        data: { startedAt: now },
      });

      if (items.filter((i) => i.isRequired).every((i) => doneIds.has(i.id))) {
        await tx.lessonPlanAssignment.updateMany({
          where: { id: assignmentId, completedAt: null },
          data: { completedAt: now },
        });
        planCompleted = true;
      }
    });
  } catch (error) {
    console.error("completeItem failed:", error instanceof Error ? error.name : "unknown");
    fail("Could not save your progress. Please try again.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/plans");
  revalidatePath(planPage);

  redirect(
    `${planPage}?saved=${encodeURIComponent(
      planCompleted ? "Lesson complete. You finished the whole plan!" : "Lesson complete. The next lesson is unlocked."
    )}`
  );
}