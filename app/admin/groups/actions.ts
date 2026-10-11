"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

export async function createGroup(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({
      name: z.string().trim().min(1, "Name is required").max(80, "Name is too long (80 characters maximum)"),
      description: z.string().trim().max(300, "Description is too long (300 characters maximum)"),
    })
    .safeParse({ name: str(formData, "name"), description: str(formData, "description") });
  if (!parsed.success) {
    go("/admin/groups", "error", parsed.error.issues[0].message);
  }

  let groupId: string | null = null;
  try {
    const group = await prisma.studentGroup.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description === "" ? null : parsed.data.description,
        createdById: profile.id,
      },
      select: { id: true },
    });
    groupId = group.id;
  } catch (error) {
    if (errorCode(error) === "P2002") {
      go("/admin/groups", "error", "A group with that name already exists");
    }
    console.error("createGroup failed:", error instanceof Error ? error.name : "unknown");
    go("/admin/groups", "error", "Could not create the group. Please try again.");
  }

  revalidatePath("/admin/groups");
  go(`/admin/groups/${groupId}`, "saved", "Group created");
}

export async function setGroupActive(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ id: z.string().min(1), active: z.enum(["true", "false"]) })
    .safeParse({ id: str(formData, "id"), active: str(formData, "active") });
  if (!parsed.success) {
    go("/admin/groups", "error", "Invalid request");
  }

  const base = `/admin/groups/${parsed.data.id}`;
  try {
    await prisma.studentGroup.update({
      where: { id: parsed.data.id },
      data: { isActive: parsed.data.active === "true" },
    });
  } catch (error) {
    if (errorCode(error) === "P2025") {
      go("/admin/groups", "error", "That group no longer exists");
    }
    console.error("setGroupActive failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not update the group. Please try again.");
  }

  revalidatePath("/admin/groups");
  revalidatePath(base);
  go(base, "saved", parsed.data.active === "true" ? "Group restored" : "Group archived");
}

export async function addMember(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ groupId: z.string().min(1), studentId: z.string().min(1, "Choose a student") })
    .safeParse({ groupId: str(formData, "groupId"), studentId: str(formData, "studentId") });
  if (!parsed.success) {
    go("/admin/groups", "error", parsed.error.issues[0].message);
  }
  const { groupId, studentId } = parsed.data;
  const base = `/admin/groups/${groupId}`;

  const group = await prisma.studentGroup.findUnique({
    where: { id: groupId },
    select: { isActive: true },
  });
  if (!group) {
    go("/admin/groups", "error", "That group no longer exists");
  }
  if (!group.isActive) {
    go(base, "error", "Restore the group before adding members");
  }

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentId, role: "STUDENT", onboardingCompletedAt: { not: null } },
    select: { id: true },
  });
  if (!student) {
    go(base, "error", "Choose a valid student");
  }

  try {
    await prisma.studentGroupMembership.create({ data: { groupId, studentId } });
  } catch (error) {
    if (errorCode(error) === "P2002") {
      go(base, "error", "That student is already in this group");
    }
    console.error("addMember failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not add the student. Please try again.");
  }

  revalidatePath(base);
  revalidatePath("/admin/groups");
  go(base, "saved", "Student added");
}

export async function removeMember(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({ groupId: z.string().min(1), studentId: z.string().min(1) })
    .safeParse({ groupId: str(formData, "groupId"), studentId: str(formData, "studentId") });
  if (!parsed.success) {
    go("/admin/groups", "error", "Invalid request");
  }
  const { groupId, studentId } = parsed.data;
  const base = `/admin/groups/${groupId}`;

  try {
    await prisma.studentGroupMembership.deleteMany({ where: { groupId, studentId } });
  } catch (error) {
    console.error("removeMember failed:", error instanceof Error ? error.name : "unknown");
    go(base, "error", "Could not remove the student. Please try again.");
  }

  revalidatePath(base);
  revalidatePath("/admin/groups");
  go(base, "saved", "Student removed");
}