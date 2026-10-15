import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { submitAttempt } from "@/lib/attempt-submit";
import prisma from "@/lib/prisma";

const noStore = { "cache-control": "no-store" };

export async function POST(
  _request: Request,
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

  try {
    const result = await submitAttempt(attemptId, profile.id);
    switch (result.kind) {
      case "submitted":
        return NextResponse.json({ ok: true, status: "SUBMITTED", alreadyEnded: false }, { headers: noStore });
      case "already_ended":
        // Not an error: a double-click or a second tab. The attempt is safely over.
        return NextResponse.json({ ok: true, status: result.status, alreadyEnded: true }, { headers: noStore });
      case "not_found":
        return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
    }
  } catch (error) {
    console.error("submit failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not submit. Please try again." }, { status: 500, headers: noStore });
  }
}