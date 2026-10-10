"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import  prisma  from "@/lib/prisma";

const BASE = "/admin/categories";

function back(kind: "error" | "saved", message: string): never {
  redirect(`${BASE}?${kind}=${encodeURIComponent(message)}`);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80, "Name is too long (80 characters maximum)");

export async function createCategory(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ subjectId: z.string().min(1, "Choose a subject"), name: nameSchema })
    .safeParse({
      subjectId: formData.get("subjectId"),
      name: formData.get("name"),
    });
  if (!parsed.success) {
    back("error", parsed.error.issues[0].message);
  }

  const { subjectId, name } = parsed.data;
  const slug = slugify(name);
  if (!slug) {
    back("error", "Name must contain letters or numbers");
  }

  // Categories may only attach to active subjects that have no children.
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, isActive: true, children: { none: {} } },
    select: { id: true },
  });
  if (!subject) {
    back("error", "Choose a valid subject");
  }

  const last = await prisma.category.aggregate({
    where: { subjectId },
    _max: { sortOrder: true },
  });

  try {
    await prisma.category.create({
      data: {
        subjectId,
        name,
        slug,
        sortOrder: (last._max.sortOrder ?? 0) + 10,
      },
    });
  } catch (error) {
    if (errorCode(error) === "P2002") {
      back("error", "A category with that name already exists in this subject");
    }
    console.error("createCategory failed:", error instanceof Error ? error.name : "unknown");
    back("error", "Could not save the category. Please try again.");
  }

  revalidatePath(BASE);
  back("saved", "Category created");
}

export async function updateCategory(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({
      id: z.string().min(1),
      name: nameSchema,
      sortOrder: z.coerce
        .number()
        .int("Order must be a whole number")
        .min(0, "Order cannot be negative")
        .max(10000, "Order is too large"),
    })
    .safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      sortOrder: formData.get("sortOrder"),
    });
  if (!parsed.success) {
    back("error", parsed.error.issues[0].message);
  }

  try {
    await prisma.category.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name, sortOrder: parsed.data.sortOrder },
    });
  } catch (error) {
    if (errorCode(error) === "P2025") {
      back("error", "That category no longer exists");
    }
    console.error("updateCategory failed:", error instanceof Error ? error.name : "unknown");
    back("error", "Could not update the category. Please try again.");
  }

  revalidatePath(BASE);
  back("saved", "Category updated");
}

export async function setCategoryActive(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ id: z.string().min(1), active: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) {
    back("error", "Invalid request");
  }

  try {
    await prisma.category.update({
      where: { id: parsed.data.id },
      data: { isActive: parsed.data.active === "true" },
    });
  } catch (error) {
    if (errorCode(error) === "P2025") {
      back("error", "That category no longer exists");
    }
    console.error("setCategoryActive failed:", error instanceof Error ? error.name : "unknown");
    back("error", "Could not update the category. Please try again.");
  }

  revalidatePath(BASE);
  back("saved", parsed.data.active === "true" ? "Category restored" : "Category archived");
}