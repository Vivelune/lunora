"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

export function ResourceUploader({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setFileName(null);
      setMessage({ ok: true, text: "Uploaded" });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Could not reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
  const labelBase =
    "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* ============ FIELDS ============ */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Title */}
        <div>
          <label htmlFor="title" className={labelBase}>
            Title
            <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
              optional
            </span>
          </label>
          <input
            id="title"
            name="title"
            maxLength={100}
            className={inputBase}
            placeholder="e.g. Periodic table reference"
          />
        </div>

        {/* File picker — custom styled */}
        <div>
          <label htmlFor="file" className={labelBase}>
            File
            <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
              PDF, PNG, JPEG, WebP · max 4 MB
            </span>
          </label>

          {/* Hidden native input — triggered by the styled label */}
          <input
            ref={fileRef}
            id="file"
            name="file"
            type="file"
            required
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileName(f ? f.name : null);
            }}
          />

          <label
            htmlFor="file"
            className="flex h-[42px] cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3.5 text-sm text-neutral-400 transition-colors hover:border-violet-400/40 hover:bg-white/[0.04] hover:text-neutral-200"
          >
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-neutral-400">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
              >
                <path
                  d="M8 3.5v9M4.5 7 8 3.5 11.5 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate">
              {fileName ?? "Choose a file…"}
            </span>
          </label>
        </div>
      </div>

      {/* ============ ACTIONS + STATUS ============ */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="group inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Uploading…
            </>
          ) : (
            <>
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
              >
                <path
                  d="M8 11.5v-9M4.5 8 8 11.5 11.5 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Upload
            </>
          )}
        </button>

        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`inline-flex items-center gap-2 text-sm ${
              message.ok ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                message.ok ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}