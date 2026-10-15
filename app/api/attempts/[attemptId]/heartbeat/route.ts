import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { acceptsWrites } from "@/lib/attempt-rules";
import { finalizeIfExpired } from "@/lib/attempts";
import prisma from "@/lib/prisma";

const RESUME_GAP_MS = 120_000;
const noStore = { "cache-control": "no-store" };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, onboardingCompletedAt: true },
  });
  if (!profile || !profile.onboardingCompletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }

  const { attemptId } = await params;

  // Only the student who owns the attempt can use it. Anyone else gets a 404.
  const owned = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId: profile.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }

  await finalizeIfExpired(owned.id);

  let reason: "load" | "tick" = "tick";
  try {
    const body = await request.json();
    if (body && body.reason === "load") reason = "load";
  } catch {
    // An empty body is fine.
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: owned.id },
    select: { status: true, deadlineAt: true, lastActivityAt: true },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }

  const now = new Date();

  if (acceptsWrites({ status: attempt.status, now, deadlineAt: attempt.deadlineAt })) {
    await prisma.examAttempt.updateMany({
      where: { id: owned.id, status: "IN_PROGRESS" },
      data: { lastActivityAt: now },
    });

    const awayMs = now.getTime() - attempt.lastActivityAt.getTime();
    if (reason === "load" && awayMs > RESUME_GAP_MS) {
      await prisma.attemptEvent.create({
        data: { attemptId: owned.id, type: "RESUMED", details: { awaySeconds: Math.round(awayMs / 1000) } },
      });
    }
  }

  return NextResponse.json(
    {
      status: attempt.status,
      deadlineAt: attempt.deadlineAt.toISOString(),
      serverNow: now.toISOString(),
    },
    { headers: noStore }
  );
}