"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

export function ResourceUploader({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage({ ok: false, text: "Choose a file" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setMessage({ ok: false, text: "The file must be 4 MB or smaller" });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/resources`, {
        method: "POST",
        body: data,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ ok: false, text: result.error ?? "Upload failed" });
        return;
      }
      form.reset();
      setMessage({ ok: true, text: "Uploaded" });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Could not reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const field = "rounded border px-3 py-2";

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">Title (optional)</label>
        <input id="title" name="title" maxLength={100} className={field} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-sm font-medium">File (PDF, PNG, JPEG, WebP, max 4 MB)</label>
        <input id="file" name="file" type="file" required
          accept="application/pdf,image/png,image/jpeg,image/webp" className={field} />
      </div>
      <button type="submit" disabled={busy} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {busy ? "Uploading..." : "Upload"}
      </button>
      {message && (
        <p role={message.ok ? "status" : "alert"}
          className={`w-full text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}