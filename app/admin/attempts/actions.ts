"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

export async function clearAttemptFlag(formData: FormData) {
  const { profile } = await requireAdmin();

  const id = formData.get("attemptId");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/attempts");
  }
  const base = `/admin/attempts/${id}`;

  const result = await prisma.examAttempt.updateMany({
    where: { id, flaggedForReview: true },
    data: { flaggedForReview: false },
  });

  if (result.count === 1) {
    await writeAuditLog({
      actorId: profile.id,
      action: "attempt.clear_flag",
      entityType: "ExamAttempt",
      entityId: id,
    });
  }

  revalidatePath("/admin/attempts");
  revalidatePath(base);
  redirect(`${base}?saved=${encodeURIComponent(result.count === 1 ? "Flag cleared after review" : "Nothing to clear")}`);
}