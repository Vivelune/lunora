import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { saveAnswer } from "@/lib/attempt-answers";
import prisma from "@/lib/prisma";

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

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("shape");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }

  const { attemptId } = await params;

  const result = await saveAnswer({
    attemptId,
    studentId: profile.id,
    questionId: body.questionId,
    selectedOptionIds: body.selectedOptionIds,
    textAnswer: body.textAnswer,
    flagged: body.flagged,
    baseRevision: body.baseRevision,
  });

  switch (result.kind) {
    case "saved":
      return NextResponse.json({ ok: true, revision: result.revision }, { headers: noStore });
    case "conflict":
      return NextResponse.json({ conflict: true, current: result.current }, { status: 409, headers: noStore });
    case "ended":
      return NextResponse.json({ ended: true }, { status: 409, headers: noStore });
    case "invalid":
      return NextResponse.json({ error: result.message }, { status: 400, headers: noStore });
    case "not_found":
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
}