"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import prisma  from "@/lib/prisma";

const MAX_ITEMS = 50;

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

const planUrl = (id: string) => `/admin/lesson-plans/${id}`;

function refresh(planId: string) {
  revalidatePath("/admin/lesson-plans");
  revalidatePath(planUrl(planId));
}

function parseObjectives(raw: string): { objectives: string[]; error?: string } {
  const objectives = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (objectives.length > 10) return { objectives, error: "Use at most 10 learning objectives" };
  if (objectives.some((l) => l.length > 200)) {
    return { objectives, error: "Each learning objective must be 200 characters or fewer" };
  }
  return { objectives };
}

const titleSchema = z.string().trim().min(1, "Title is required").max(150, "Title is too long (150 maximum)");
const descriptionSchema = z.string().trim().max(500, "Description is too long (500 maximum)");

export async function createPlan(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({ title: titleSchema, description: descriptionSchema, subjectId: z.string().min(1, "Choose a subject") })
    .safeParse({
      title: str(formData, "title"),
      description: str(formData, "description"),
      subjectId: str(formData, "subjectId"),
    });
  if (!parsed.success) {
    go("/admin/lesson-plans/new", "error", parsed.error.issues[0].message);
  }

  const subject = await prisma.subject.findFirst({
    where: { id: parsed.data.subjectId, isActive: true, children: { none: {} } },
    select: { id: true },
  });
  if (!subject) {
    go("/admin/lesson-plans/new", "error", "Choose a valid subject");
  }

  let planId: string | null = null;
  try {
    const plan = await prisma.lessonPlan.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description === "" ? null : parsed.data.description,
        subjectId: subject.id,
        createdById: profile.id,
        versions: { create: { versionNumber: 1 } },
      },
      select: { id: true },
    });
    planId = plan.id;
  } catch (error) {
    console.error("createPlan failed:", error instanceof Error ? error.name : "unknown");
    go("/admin/lesson-plans/new", "error", "Could not create the plan. Please try again.");
  }

  revalidatePath("/admin/lesson-plans");
  go(planUrl(planId as string), "saved", "Plan created. Add some lessons.");
}

export async function updatePlan(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({
      id: z.string().min(1),
      title: titleSchema,
      description: descriptionSchema,
      categoryId: z.string(),
      objectives: z.string().max(4000, "Objectives are too long"),
    })
    .safeParse({
      id: str(formData, "id"),
      title: str(formData, "title"),
      description: str(formData, "description"),
      categoryId: str(formData, "categoryId"),
      objectives: str(formData, "objectives"),
    });
  if (!parsed.success) {
    go("/admin/lesson-plans", "error", parsed.error.issues[0].message);
  }
  const data = parsed.data;
  const base = planUrl(data.id);

  const plan = await prisma.lessonPlan.findUnique({ where: { id: data.id }, select: { subjectId: true } });
  if (!plan) {
    go("/admin/lesson-plans", "error", "That plan no longer exists");
  }

  const { objectives, error } = parseObjectives(data.objectives);
  if (error) {
    go(base, "error", error);
  }

  let categoryId: string | null = null;
  if (data.categoryId !== "") {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, subjectId: plan.subjectId, isActive: true },
      select: { id: true },
    });
    if (!category) {
      go(base, "error", "That category does not belong to this plan's subject");
    }
    categoryId = category.id;
  }

  try {
    await prisma.lessonPlan.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description === "" ? null : data.description,
        categoryId,
        objectives,
      },
    });
  } catch (err) {
    console.error("updatePlan failed:", err instanceof Error ? err.name : "unknown");
    go(base, "error", "Could not save the plan. Please try again.");
  }

  refresh(data.id);
  go(base, "saved", "Plan details saved");
}

export async function addItem(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ planId: z.string().min(1), lessonId: z.string().min(1, "Choose a lesson") })
    .safeParse({ planId: str(formData, "planId"), lessonId: str(formData, "lessonId") });
  if (!parsed.success) {
    go("/admin/lesson-plans", "error", parsed.error.issues[0].message);
  }
  const { planId, lessonId } = parsed.data;
  const base = planUrl(planId);

  const version = await prisma.lessonPlanVersion.findFirst({
    where: { planId, publishedAt: null },
    select: { id: true, plan: { select: { subjectId: true } } },
  });
  if (!version) {
    go(base, "error", "This plan has no editable version. Create a new version first.");
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, status: "PUBLISHED", subjectId: version.plan.subjectId },
    select: { id: true },
  });
  if (!lesson) {
    go(base, "error", "Choose a published lesson from this plan's subject");
  }

  const count = await prisma.lessonPlanItem.count({ where: { versionId: version.id } });
  if (count >= MAX_ITEMS) {
    go(base, "error", `A plan can have at most ${MAX_ITEMS} items`);
  }

  const last = await prisma.lessonPlanItem.aggregate({
    where: { versionId: version.id },
    _max: { position: true },
  });

  try {
    await prisma.lessonPlanItem.create({
      data: {
        versionId: version.id,
        lessonId: lesson.id,
        type: "LESSON",
        position: (last._max.position ?? 0) + 1,
      },
    });
  } catch (error) {
    if (errorCode(error) === "P2002") {
      go(base, "error", "That lesson is already in the plan, or another change just happened. Reload and try again.");
    }
    console.error("addItem failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not add the lesson. Please try again.");
  }

  refresh(planId);
  go(base, "saved", "Lesson added");
}

export async function removeItem(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ planId: z.string().min(1), itemId: z.string().min(1) })
    .safeParse({ planId: str(formData, "planId"), itemId: str(formData, "itemId") });
  if (!parsed.success) {
    go("/admin/lesson-plans", "error", "Invalid request");
  }
  const { planId, itemId } = parsed.data;
  const base = planUrl(planId);

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.lessonPlanItem.findFirst({
        where: { id: itemId, version: { planId, publishedAt: null } },
        select: { id: true, versionId: true, position: true },
      });
      if (!item) throw new Error("NOT_FOUND");

      await tx.lessonPlanItem.delete({ where: { id: item.id } });

      const later = await tx.lessonPlanItem.findMany({
        where: { versionId: item.versionId, position: { gt: item.position } },
        orderBy: { position: "asc" },
        select: { id: true, position: true },
      });
      for (const row of later) {
        await tx.lessonPlanItem.update({ where: { id: row.id }, data: { position: row.position - 1 } });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      go(base, "error", "That item is not in the editable version");
    }
    console.error("removeItem failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not remove the item. Please try again.");
  }

  refresh(planId);
  go(base, "saved", "Item removed");
}

export async function moveItem(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ planId: z.string().min(1), itemId: z.string().min(1), direction: z.enum(["up", "down"]) })
    .safeParse({
      planId: str(formData, "planId"),
      itemId: str(formData, "itemId"),
      direction: str(formData, "direction"),
    });
  if (!parsed.success) {
    go("/admin/lesson-plans", "error", "Invalid request");
  }
  const { planId, itemId, direction } = parsed.data;
  const base = planUrl(planId);

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.lessonPlanItem.findFirst({
        where: { id: itemId, version: { planId, publishedAt: null } },
        select: { id: true, versionId: true, position: true },
      });
      if (!item) throw new Error("NOT_FOUND");

      const neighbour = await tx.lessonPlanItem.findFirst({
        where: {
          versionId: item.versionId,
          position: direction === "up" ? item.position - 1 : item.position + 1,
        },
        select: { id: true, position: true },
      });
      if (!neighbour) return;

      // Three-step swap through a temporary position keeps the unique rule happy.
      await tx.lessonPlanItem.update({ where: { id: item.id }, data: { position: -1 } });
      await tx.lessonPlanItem.update({ where: { id: neighbour.id }, data: { position: item.position } });
      await tx.lessonPlanItem.update({ where: { id: item.id }, data: { position: neighbour.position } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      go(base, "error", "That item is not in the editable version");
    }
    console.error("moveItem failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not reorder. Please try again.");
  }

  refresh(planId);
  go(base, "saved", "Order updated");
}

export async function toggleRequired(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ planId: z.string().min(1), itemId: z.string().min(1) })
    .safeParse({ planId: str(formData, "planId"), itemId: str(formData, "itemId") });
  if (!parsed.success) {
    go("/admin/lesson-plans", "error", "Invalid request");
  }
  const { planId, itemId } = parsed.data;
  const base = planUrl(planId);

  const item = await prisma.lessonPlanItem.findFirst({
    where: { id: itemId, version: { planId, publishedAt: null } },
    select: { id: true, isRequired: true },
  });
  if (!item) {
    go(base, "error", "That item is not in the editable version");
  }

  await prisma.lessonPlanItem.update({ where: { id: item.id }, data: { isRequired: !item.isRequired } });

  refresh(planId);
  go(base, "saved", item.isRequired ? "Item is now optional" : "Item is now required");
}

export async function publishPlan(formData: FormData) {
  await requireAdmin();

  const planId = str(formData, "planId");
  if (!planId) {
    go("/admin/lesson-plans", "error", "Invalid request");
  }
  const base = planUrl(planId);

  const version = await prisma.lessonPlanVersion.findFirst({
    where: { planId, publishedAt: null },
    select: {
      id: true,
      versionNumber: true,
      plan: { select: { status: true } },
      items: { select: { isRequired: true, lesson: { select: { status: true, title: true } } } },
    },
  });
  if (!version) {
    go(base, "error", "There is no editable version to publish");
  }
  if (version.plan.status === "ARCHIVED") {
    go(base, "error", "Restore the plan before publishing");
  }
  if (version.items.length === 0) {
    go(base, "error", "Add at least one lesson before publishing");
  }
  if (!version.items.some((i) => i.isRequired)) {
    go(base, "error", "At least one item must be required");
  }
  const unpublished = version.items.find((i) => i.lesson?.status !== "PUBLISHED");
  if (unpublished) {
    go(base, "error", `Every lesson must be published first (check: ${unpublished.lesson?.title ?? "a lesson"})`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.lessonPlanVersion.updateMany({
        where: { id: version.id, publishedAt: null },
        data: { publishedAt: new Date() },
      });
      if (result.count === 0) throw new Error("ALREADY_PUBLISHED");
      await tx.lessonPlan.update({ where: { id: planId }, data: { status: "PUBLISHED" } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_PUBLISHED") {
      go(base, "error", "This version was already published. Reload the page.");
    }
    console.error("publishPlan failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not publish. Please try again.");
  }

  refresh(planId);
  go(base, "saved", `Version ${version.versionNumber} published and frozen`);
}

export async function startNewVersion(formData: FormData) {
  await requireAdmin();

  const planId = str(formData, "planId");
  if (!planId) {
    go("/admin/lesson-plans", "error", "Invalid request");
  }
  const base = planUrl(planId);

  try {
    await prisma.$transaction(async (tx) => {
      const latest = await tx.lessonPlanVersion.findFirst({
        where: { planId },
        orderBy: { versionNumber: "desc" },
        select: {
          versionNumber: true,
          publishedAt: true,
          items: {
            orderBy: { position: "asc" },
            select: { position: true, type: true, lessonId: true, isRequired: true },
          },
        },
      });
      if (!latest) throw new Error("NO_VERSION");
      if (!latest.publishedAt) throw new Error("ALREADY_EDITING");

      await tx.lessonPlanVersion.create({
        data: {
          planId,
          versionNumber: latest.versionNumber + 1,
          items: { create: latest.items },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_EDITING") {
      go(base, "error", "This plan already has an editable version");
    }
    if (errorCode(error) === "P2002") {
      go(base, "error", "Another admin just started a new version. Reload the page.");
    }
    console.error("startNewVersion failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not create a new version. Please try again.");
  }

  refresh(planId);
  go(base, "saved", "New editable version created from the latest published one");
}

export async function setPlanArchived(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ planId: z.string().min(1), archive: z.enum(["true", "false"]) })
    .safeParse({ planId: str(formData, "planId"), archive: str(formData, "archive") });
  if (!parsed.success) {
    go("/admin/lesson-plans", "error", "Invalid request");
  }
  const { planId } = parsed.data;
  const base = planUrl(planId);

  const published = await prisma.lessonPlanVersion.count({
    where: { planId, publishedAt: { not: null } },
  });

  await prisma.lessonPlan.update({
    where: { id: planId },
    data: { status: parsed.data.archive === "true" ? "ARCHIVED" : published > 0 ? "PUBLISHED" : "DRAFT" },
  });

  refresh(planId);
  go(base, "saved", parsed.data.archive === "true" ? "Plan archived" : "Plan restored");
}