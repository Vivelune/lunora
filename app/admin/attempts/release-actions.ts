"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { RELEASE_ROW_SELECT, releaseFromRow } from "@/lib/results-release";

export async function setAttemptRelease(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({
      id: z.string().min(1),
      kind: z.enum(["results", "explanations"]),
      mode: z.enum(["release", "withdraw"]),
    })
    .safeParse({
      id: formData.get("id"),
      kind: formData.get("kind"),
      mode: formData.get("mode"),
    });
  if (!parsed.success) {
    redirect("/admin/attempts");
  }
  const { id, kind, mode } = parsed.data;
  const base = `/admin/attempts/${id}`;
  const back = (key: "saved" | "error", message: string): never =>
    redirect(`${base}?${key}=${encodeURIComponent(message)}`);

  const attempt = await prisma.examAttempt.findUnique({
    where: { id },
    select: { status: true, ...RELEASE_ROW_SELECT },
  });
  if (!attempt) {
    redirect("/admin/attempts");
  }
  if (attempt.status !== "GRADED") {
    back("error", "Only graded attempts can be released");
  }

  const now = new Date();

  if (mode === "release") {
    if (kind === "results") {
      await prisma.examAttempt.update({ where: { id }, data: { resultsReleasedAt: now } });
    } else {
      const state = releaseFromRow(attempt, now);
      if (!state.resultsReleased) {
        back("error", "Release the results first. Explanations cannot be released before the results.");
      }
      await prisma.examAttempt.update({ where: { id }, data: { explanationsReleasedAt: now } });
    }
  } else if (kind === "results") {
    // Withdrawing the results also withdraws any manual explanation release.
    await prisma.examAttempt.update({ where: { id }, data: { resultsReleasedAt: null, explanationsReleasedAt: null } });
  } else {
    await prisma.examAttempt.update({ where: { id }, data: { explanationsReleasedAt: null } });
  }

  await writeAuditLog({
    actorId: profile.id,
    action: `attempt.${mode}_${kind}`,
    entityType: "ExamAttempt",
    entityId: id,
  });

  revalidatePath(base);
  revalidatePath("/admin/attempts");

  const after = await prisma.examAttempt.findUnique({ where: { id }, select: RELEASE_ROW_SELECT });
  const state = after ? releaseFromRow(after) : null;
  if (mode === "withdraw" && state && (kind === "results" ? state.resultsReleased : state.explanationsReleased)) {
    back("saved", "The manual release was withdrawn, but this exam's release policy still shows it to the student.");
  }
  back("saved", mode === "release" ? `The ${kind} are now visible to the student` : `The manual release of the ${kind} was withdrawn`);
}