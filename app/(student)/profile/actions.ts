"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizePhone, onboardingSchema } from "@/lib/validation/profile";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateProfile(formData: FormData) {
  // Who is editing comes from the session, never from the form.
  const { profile } = await requireCompletedProfile();

  const parsed = onboardingSchema.safeParse({
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    phone: field(formData, "phone"),
    gradeLevel: field(formData, "gradeLevel"),
  });
  if (!parsed.success) {
    redirect(`/profile?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    redirect(`/profile?error=${encodeURIComponent("Enter a valid phone number")}`);
  }

  try {
    // Only these four fields can ever change here. Role and onboarding status are not touched.
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone,
        gradeLevel: parsed.data.gradeLevel,
      },
    });
  } catch (error) {
    console.error("updateProfile failed:", error instanceof Error ? error.name : "unknown");
    redirect(`/profile?error=${encodeURIComponent("Could not save your changes. Please try again.")}`);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect(`/profile?saved=${encodeURIComponent("Profile updated")}`);
}