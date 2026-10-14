import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import prisma from "@/lib/prisma";
import { studentCanViewExamImage } from "@/lib/exam-image-access";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true, onboardingCompletedAt: true },
  });
  if (!profile) {
    return notFound();
  }

  const { assetId } = await params;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: { pathname: true, contentType: true },
  });
  if (!asset) {
    return notFound();
  }

  if (profile.role !== "ADMIN") {
    if (!profile.onboardingCompletedAt) return notFound();
    const allowed = await studentCanViewExamImage(profile.id, assetId);
    if (!allowed) return notFound();
  }

  const result = await get(asset.pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return notFound();
  }

  return new Response(result.stream, {
    headers: {
      "content-type": asset.contentType,
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}