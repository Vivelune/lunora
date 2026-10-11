"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function deleteResource(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/lessons");
  }

  const resource = await prisma.learningResource.findUnique({
    where: { id },
    select: { id: true, lessonId: true, storageUrl: true },
  });
  if (!resource) {
    redirect("/admin/lessons");
  }

  // Database first: if the file removal then fails we only keep an unreferenced
  // private file, which is safer than a record pointing at a missing file.
  await prisma.learningResource.delete({ where: { id: resource.id } });

  try {
    await del(resource.storageUrl);
  } catch (error) {
    console.error("resource file delete failed:", error instanceof Error ? error.name : "unknown");
  }

  revalidatePath(`/admin/lessons/${resource.lessonId}`);
  redirect(`/admin/lessons/${resource.lessonId}?saved=Resource+deleted`);
}