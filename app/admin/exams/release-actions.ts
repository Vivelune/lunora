"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { getBulkReleaseTargets } from "@/lib/results-release";

export async function releaseExamBulk(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = z
    .object({
      examId: z.string().min(1),
      kind: z.enum(["results", "explanations"]),
      expectedCount: z.string(),
    })
    .safeParse({
      examId: formData.get("examId"),
      kind: formData.get("kind"),
      expectedCount: formData.get("expectedCount"),
    });
  if (!parsed.success) {
    redirect("/admin/exams");
  }
  const { examId, kind } = parsed.data;
  const base = `/admin/exams/${examId}`;
  const back = (key: "saved" | "error", message: string): never =>
    redirect(`${base}?${key}=${encodeURIComponent(message)}`);

  if (formData.get("confirm") !== "yes") {
    back("error", "Tick the confirmation box to release results");
  }

  const targets = await getBulkReleaseTargets(examId, kind);
  const expected = Number(parsed.data.expectedCount);
  if (!Number.isInteger(expected) || expected !== targets.length) {
    back("error", `The number of attempts changed (you saw ${Number.isInteger(expected) ? expected : "?"}, now ${targets.length}). Review and confirm again.`);
  }
  if (targets.length === 0) {
    back("error", "Nothing to release");
  }

  const now = new Date();
  const result = await prisma.examAttempt.updateMany({
    where: { id: { in: targets }, status: "GRADED" },
    data: kind === "results" ? { resultsReleasedAt: now } : { explanationsReleasedAt: now },
  });

  await writeAuditLog({
    actorId: profile.id,
    action: `exam.bulk_release_${kind}`,
    entityType: "Exam",
    entityId: examId,
    details: { released: result.count },
  });

  revalidatePath(base);
  revalidatePath("/admin/attempts");
  back("saved", `Released ${kind} for ${result.count} attempt${result.count === 1 ? "" : "s"}`);
}