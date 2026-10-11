import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getAdminProfile } from "@/lib/auth";
import  prisma  from "@/lib/prisma";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, detectType } from "@/lib/uploads";

const MAX_RESOURCES_PER_LESSON = 20;

function cleanFilename(name: string): string {
  return Array.from(name)
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) !== 127 && ch !== "/" && ch !== "\\")
    .join("")
    .slice(0, 200);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const admin = await getAdminProfile();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "The file must be 4 MB or smaller" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectType(bytes);
  if (!detected) {
    return NextResponse.json(
      { error: "Only PDF, PNG, JPEG and WebP files are allowed" },
      { status: 415 }
    );
  }
  if (file.type && file.type !== detected) {
    return NextResponse.json(
      { error: "The file contents do not match its declared type" },
      { status: 415 }
    );
  }

  const existingCount = await prisma.learningResource.count({ where: { lessonId } });
  if (existingCount >= MAX_RESOURCES_PER_LESSON) {
    return NextResponse.json(
      { error: `A lesson can have at most ${MAX_RESOURCES_PER_LESSON} resources` },
      { status: 400 }
    );
  }

  const originalFilename = cleanFilename(file.name) || "file";
  const rawTitle = form.get("title");
  const typedTitle = typeof rawTitle === "string" ? rawTitle.trim() : "";
  const title = (typedTitle || originalFilename.replace(/\.[^.]+$/, "") || "Untitled").slice(0, 100);

  // Random path: the client never controls where a file is stored.
  const pathname = `lessons/${lessonId}/${crypto.randomUUID()}.${ALLOWED_TYPES[detected]}`;

  let blob;
  try {
    blob = await put(pathname, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      contentType: detected,
    });
  } catch (error) {
    console.error("resource upload (storage) failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Storage is unavailable. Try again." }, { status: 502 });
  }

  try {
    await prisma.learningResource.create({
      data: {
        lessonId,
        title,
        originalFilename,
        pathname: blob.pathname,
        storageUrl: blob.url,
        contentType: detected,
        sizeBytes: file.size,
        uploadedById: admin.id,
      },
    });
  } catch (error) {
    console.error("resource upload (database) failed:", error instanceof Error ? error.name : "unknown");
    try {
      await del(blob.url);
    } catch {
      // The file is private and unreferenced; harmless if cleanup fails.
    }
    return NextResponse.json({ error: "Could not save the resource. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}