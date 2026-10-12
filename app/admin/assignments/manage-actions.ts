"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { PRIORITIES, parseDay } from "@/lib/assignments";
import  prisma  from "@/lib/prisma";

function go(path: string, kind: "error" | "saved", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

type LatestVersion = {
  id: string;
  versionNumber: number;
  items: { id: string; isRequired: boolean; lessonId: string | null }[];
};

async function latestPublished(planId: string): Promise<LatestVersion | null> {
  return prisma.lessonPlanVersion.findFirst({
    where: { planId, publishedAt: { not: null } },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      items: { select: { id: true, isRequired: true, lessonId: true } },
    },
  });
}

/**
 * Moves ONE assignment to the latest version in a single transaction.
 * Progress is carried over by lesson (the same lesson in the new version counts as done).
 * Returns false if the assignment is not eligible (completed, cancelled, or already latest).
 */
async function moveOne(assignmentId: string, latest: LatestVersion): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.lessonPlanAssignment.findFirst({
      where: {
        id: assignmentId,
        status: "ACTIVE",
        completedAt: null,
        NOT: { versionId: latest.id },
      },
      select: {
        id: true,
        progress: { select: { completedAt: true, item: { select: { lessonId: true } } } },
      },
    });
    if (!assignment) return false;

    const itemForLesson = new Map<string, string>();
    for (const item of latest.items) {
      if (item.lessonId) itemForLesson.set(item.lessonId, item.id);
    }

    // new item id -> earliest completion time
    const carried = new Map<string, Date>();
    for (const row of assignment.progress) {
      const lessonId = row.item.lessonId;
      const newItemId = lessonId ? itemForLesson.get(lessonId) : undefined;
      if (!newItemId) continue;
      const existing = carried.get(newItemId);
      if (!existing || row.completedAt.getTime() < existing.getTime()) {
        carried.set(newItemId, row.completedAt);
      }
    }

    if (carried.size > 0) {
      await tx.lessonPlanItemProgress.createMany({
        data: [...carried].map(([itemId, completedAt]) => ({ assignmentId, itemId, completedAt })),
        skipDuplicates: true,
      });
    }

    const allRequiredDone = latest.items.filter((i) => i.isRequired).every((i) => carried.has(i.id));

    await tx.lessonPlanAssignment.update({
      where: { id: assignmentId },
      data: { versionId: latest.id, ...(allRequiredDone ? { completedAt: new Date() } : {}) },
    });
    return true;
  });
}

export async function moveAssignmentToLatest(formData: FormData) {
  const { profile } = await requireAdmin();

  const assignmentId = str(formData, "assignmentId");
  if (!assignmentId) {
    go("/admin/assignments", "error", "Invalid request");
  }
  const base = `/admin/assignments/${assignmentId}`;

  const assignment = await prisma.lessonPlanAssignment.findUnique({
    where: { id: assignmentId },
    select: { planId: true, versionId: true, status: true, completedAt: true },
  });
  if (!assignment) {
    go("/admin/assignments", "error", "That assignment no longer exists");
  }
  if (assignment.status !== "ACTIVE") {
    go(base, "error", "Restore the assignment before moving it");
  }
  if (assignment.completedAt) {
    go(base, "error", "Completed assignments stay on the version the student completed");
  }

  const latest = await latestPublished(assignment.planId);
  if (!latest || latest.id === assignment.versionId) {
    go(base, "error", "This assignment is already on the latest published version");
  }

  let moved = false;
  try {
    moved = await moveOne(assignmentId, latest);
  } catch (error) {
    console.error("moveAssignmentToLatest failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not move the assignment. Nothing was changed.");
  }
  if (!moved) {
    go(base, "error", "This assignment can no longer be moved. Reload the page.");
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "assignment.move_version",
    entityType: "LessonPlanAssignment",
    entityId: assignmentId,
    details: { fromVersionId: assignment.versionId, toVersionNumber: latest.versionNumber },
  });

  revalidatePath(base);
  revalidatePath("/admin/assignments");
  go(base, "saved", `Moved to version ${latest.versionNumber}`);
}

export async function moveStudentsToLatest(formData: FormData) {
  const { profile } = await requireAdmin();

  const planId = str(formData, "planId");
  if (!planId) {
    go("/admin/lesson-plans", "error", "Invalid request");
  }
  const base = `/admin/lesson-plans/${planId}`;

  if (str(formData, "confirm") !== "yes") {
    go(base, "error", "Tick the confirmation box to move students");
  }

  const latest = await latestPublished(planId);
  if (!latest) {
    go(base, "error", "This plan has no published version");
  }

  const eligible = await prisma.lessonPlanAssignment.findMany({
    where: { planId, status: "ACTIVE", completedAt: null, NOT: { versionId: latest.id } },
    select: { id: true },
  });

  const expected = Number(str(formData, "expectedCount"));
  if (!Number.isInteger(expected) || expected !== eligible.length) {
    go(
      base,
      "error",
      `The number of students changed (you saw ${Number.isInteger(expected) ? expected : "?"}, now ${eligible.length}). Review and confirm again.`
    );
  }
  if (eligible.length === 0) {
    go(base, "error", "Nobody needs to be moved");
  }

  let moved = 0;
  for (const { id } of eligible) {
    try {
      if (await moveOne(id, latest)) moved += 1;
    } catch (error) {
      console.error("moveStudentsToLatest item failed:", error instanceof Error ? error.name : "unknown");
    }
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "assignment.bulk_move_version",
    entityType: "LessonPlan",
    entityId: planId,
    details: { toVersionNumber: latest.versionNumber, requested: eligible.length, moved },
  });

  revalidatePath(base);
  revalidatePath("/admin/assignments");

  if (moved < eligible.length) {
    go(base, "error", `Moved ${moved} of ${eligible.length} students. Some could not be moved. Reload and try again.`);
  }
  go(base, "saved", `Moved ${moved} student${moved === 1 ? "" : "s"} to version ${latest.versionNumber}`);
}

export async function updateAssignmentDetails(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({
      id: z.string().min(1),
      startDate: z.string(),
      dueDate: z.string(),
      priority: z.enum(PRIORITIES, { message: "Choose a priority" }),
      instructions: z.string().trim().max(1000, "Instructions are too long (1000 characters maximum)"),
    })
    .safeParse({
      id: str(formData, "id"),
      startDate: str(formData, "startDate"),
      dueDate: str(formData, "dueDate"),
      priority: str(formData, "priority"),
      instructions: str(formData, "instructions"),
    });
  if (!parsed.success) {
    go("/admin/assignments", "error", parsed.error.issues[0].message);
  }
  const data = parsed.data;
  const base = `/admin/assignments/${data.id}`;

  const existing = await prisma.lessonPlanAssignment.findUnique({
    where: { id: data.id },
    select: { status: true, dueDate: true },
  });
  if (!existing) {
    go("/admin/assignments", "error", "That assignment no longer exists");
  }
  if (existing.status !== "ACTIVE") {
    go(base, "error", "Restore the assignment before editing it");
  }

  const start = parseDay(data.startDate, false);
  const due = parseDay(data.dueDate, true);
  if (!start.ok) {
    go(base, "error", "The start date is not valid");
  }
  if (!due.ok) {
    go(base, "error", "The due date is not valid");
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueChanged = (due.date?.getTime() ?? null) !== (existing.dueDate?.getTime() ?? null);
  if (dueChanged && due.date && due.date.getTime() < todayUtc) {
    go(base, "error", "The due date cannot be moved into the past");
  }
  if (start.date && due.date && due.date.getTime() < start.date.getTime()) {
    go(base, "error", "The due date cannot be before the start date");
  }

  try {
    await prisma.lessonPlanAssignment.update({
      where: { id: data.id },
      data: {
        startDate: start.date,
        dueDate: due.date,
        priority: data.priority,
        instructions: data.instructions === "" ? null : data.instructions,
      },
    });
  } catch (error) {
    console.error("updateAssignmentDetails failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not save the changes. Please try again.");
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "assignment.update",
    entityType: "LessonPlanAssignment",
    entityId: data.id,
    details: { dueChanged, priority: data.priority },
  });

  revalidatePath(base);
  revalidatePath("/admin/assignments");
  go(base, "saved", "Assignment updated");
}