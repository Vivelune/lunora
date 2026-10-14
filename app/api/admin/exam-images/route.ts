import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getAdminProfile } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, detectType } from "@/lib/uploads";

export async function POST(request: Request) {
  const admin = await getAdminProfile();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "The image must be 4 MB or smaller" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectType(bytes);
  if (!detected || !detected.startsWith("image/")) {
    return NextResponse.json({ error: "Only PNG, JPEG and WebP images are allowed" }, { status: 415 });
  }
  if (file.type && file.type !== detected) {
    return NextResponse.json({ error: "The file contents do not match its declared type" }, { status: 415 });
  }

  // Random path: the client never controls where a file is stored.
  const pathname = `exam-images/${crypto.randomUUID()}.${ALLOWED_TYPES[detected]}`;

  let blob;
  try {
    blob = await put(pathname, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      contentType: detected,
    });
  } catch (error) {
    console.error("exam image upload (storage) failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Storage is unavailable. Try again." }, { status: 502 });
  }

  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        pathname: blob.pathname,
        storageUrl: blob.url,
        contentType: detected,
        sizeBytes: file.size,
        uploadedById: admin.id,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: asset.id });
  } catch (error) {
    console.error("exam image upload (database) failed:", error instanceof Error ? error.name : "unknown");
    try {
      await del(blob.url);
    } catch {
      // Unreferenced private file; harmless if cleanup fails.
    }
    return NextResponse.json({ error: "Could not save the image. Try again." }, { status: 500 });
  }
}