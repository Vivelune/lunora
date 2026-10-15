import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { recordFocusEvent, type FocusEventType } from "@/lib/attempt-focus";
import prisma from "@/lib/prisma";

const noStore = { "cache-control": "no-store" };
const ALLOWED: FocusEventType[] = ["FOCUS_LOST", "FOCUS_RETURNED", "FULLSCREEN_EXITED"];

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

  let type: unknown;
  try {
    const body = await request.json();
    type = body?.type;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }
  if (typeof type !== "string" || !ALLOWED.includes(type as FocusEventType)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }

  const { attemptId } = await params;

  try {
    const result = await recordFocusEvent({ attemptId, studentId: profile.id, type: type as FocusEventType });

    switch (result.kind) {
      case "not_found":
        return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
      case "ended":
        return NextResponse.json({ ended: true }, { headers: noStore });
      case "off":
        return NextResponse.json({ monitoring: false }, { headers: noStore });
      case "recorded":
        return NextResponse.json(
          {
            monitoring: true,
            counted: result.counted,
            violations: result.violations,
            limit: result.limit,
            action: result.action,
            ended: result.action === "END",
          },
          { headers: noStore }
        );
    }
  } catch (error) {
    console.error("focus event failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Could not record" }, { status: 500, headers: noStore });
  }
}