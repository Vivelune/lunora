"use server";

import { auth } from "@clerk/nextjs/server";
import  prisma  from "@/lib/prisma";
import {
  onboardingSchema,
  normalizePhone,
  type OnboardingInput,
} from "@/lib/validation/profile";

export type OnboardingResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export async function completeOnboarding(
  input: OnboardingInput
): Promise<OnboardingResult> {
  // 1. Who is asking? Never trust an ID sent from the browser.
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, message: "You must be signed in." };
  }

  // 2. Validate on the server.
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: { phone: "Enter a valid phone number" },
    };
  }

  // 3. Save. upsert = "create if missing, otherwise update", keyed on the
  //    unique clerkUserId, so repeated submissions can never create duplicates.
  try {
    await prisma.studentProfile.upsert({
      where: { clerkUserId: userId },
      create: {
        clerkUserId: userId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone,
        gradeLevel: parsed.data.gradeLevel,
        onboardingCompletedAt: new Date(),
      },
      update: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone,
        gradeLevel: parsed.data.gradeLevel,
        onboardingCompletedAt: new Date(),
      },
    });
  } catch (error) {
    // Log only the error type: never log personal data or connection details.
    console.error(
      "completeOnboarding failed:",
      error instanceof Error ? error.name : "unknown error"
    );
    return {
      ok: false,
      message: "We couldn't save your profile. Please try again in a moment.",
    };
  }

  return { ok: true };
}