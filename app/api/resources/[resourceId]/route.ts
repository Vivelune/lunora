import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import prisma  from "@/lib/prisma";
import { studentHasLessonAccess } from "@/lib/lesson-access";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
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

  const { resourceId } = await params;
  const resource = await prisma.learningResource.findUnique({
    where: { id: resourceId },
    select: {
      pathname: true,
      contentType: true,
      originalFilename: true,
      lesson: { select: { id: true, status: true } },
    },
  });
  if (!resource) {
    return notFound();
  }

  if (profile.role !== "ADMIN") {
    if (!profile.onboardingCompletedAt) return notFound();
    if (resource.lesson.status !== "PUBLISHED") return notFound();
    const allowed = await studentHasLessonAccess(profile.id, resource.lesson.id);
    if (!allowed) return notFound();
  }

  const result = await get(resource.pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return notFound();
  }

  return new Response(result.stream, {
    headers: {
      "content-type": resource.contentType,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(resource.originalFilename)}`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}