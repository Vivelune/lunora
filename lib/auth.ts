import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "./prisma";


/** Returns the signed-in Clerk user ID, or redirects to sign-in. */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
}

/** Returns the Clerk user ID and their Neon profile (null if none exists yet). */
export async function getCurrentProfile() {
  const userId = await requireUserId();
  const profile = await prisma.studentProfile.findUnique({
    where: { clerkUserId: userId },
  });
  return { userId, profile };
}

export async function requireCompletedProfile() {
  const { userId, profile } = await getCurrentProfile();

  if (!profile || !profile.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  return { userId, profile };
}