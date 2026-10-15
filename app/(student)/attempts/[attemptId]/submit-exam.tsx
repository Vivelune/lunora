"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AnswerLike = {
  selectedOptionIds: string[];
  textAnswer: string;
  flagged: boolean;
};

export function SubmitExam({
  attemptId,
  questionIds,
  answers,
  pending,
  failing,
  flushAll,
  settle,
  onJump,
}: {
  attemptId: string;
  questionIds: string[];
  answers: Record<string, AnswerLike>;
  pending: number;
  failing: number;
  flushAll: () => void;
  settle: (timeoutMs: number) => Promise<boolean>;
  onJump: (index: number) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerForce, setOfferForce] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const unanswered: number[] = [];
  const flagged: number[] = [];
  questionIds.forEach((id, index) => {
    const a = answers[id];
    const answered =
      !!a && (a.selectedOptionIds.length > 0 || a.textAnswer.trim() !== "");
    if (!answered) unanswered.push(index + 1);
    if (a?.flagged) flagged.push(index + 1);
  });

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting]);

  function openDialog() {
    flushAll();
    setError(null);
    setOfferForce(false);
    setOpen(true);
  }

  async function submit(force: boolean) {
    setSubmitting(true);
    setError(null);

    flushAll();
    const saved = await settle(10_000);
    if (!saved && !force) {
      setError(
        "Some of your answers could not be saved. Check your internet connection and try again."
      );
      setOfferForce(true);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      if (response.ok) {
        // The server page now shows the ended view.
        router.refresh();
        return;
      }
      setError("We could not submit your exam. Please try again.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setSubmitting(false);
  }

  const jump = (number: number) => {
    onJump(number - 1);
    setOpen(false);
  };

  const list = (numbers: number[]) =>
    numbers.map((n, i) => (
      <span key={n}>
        <button
          type="button"
          onClick={() => jump(n)}
          className="text-violet-300 underline-offset-2 transition-colors hover:text-violet-200 hover:underline"
        >
          {n}
        </button>
        {i < numbers.length - 1 ? <span className="text-neutral-600">, </span> : ""}
      </span>
    ));

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="group mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
      >
        Submit exam
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
        >
          <path
            d="M3 8h10m0 0-4-4m4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!submitting) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/60"
          >
            {/* ============ HEADER ============ */}
            <div className="border-b border-white/5 px-6 pb-5 pt-6">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400" />
                <h2
                  id="submit-title"
                  className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300"
                >
                  Submit exam
                </h2>
              </div>

              <p className="mt-3 text-base leading-relaxed text-neutral-300">
                Once you submit, you{" "}
                <strong className="font-semibold text-white">
                  cannot change your answers
                </strong>
                . The timer stops immediately.
              </p>
            </div>

            {/* ============ BODY ============ */}
            <div className="flex flex-col gap-4 px-6 py-5">
              {/* Answered state */}
              {unanswered.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3">
                  <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-emerald-200">
                      You answered every question.
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-300/70">
                      Nice work — you&apos;re ready to submit.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3">
                  <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6.25"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                      <path
                        d="M8 5v3.5M8 11h.01"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-amber-200">
                      {unanswered.length} unanswered question
                      {unanswered.length === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-300/80">
                      {list(unanswered)}
                    </p>
                  </div>
                </div>
              )}

              {/* Flagged state */}
              {flagged.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.04] px-4 py-3">
                  <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        d="M4 3.5h8v9l-4-2.5-4 2.5v-9Z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-amber-200">
                      {flagged.length} flagged for review
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-300/80">
                      {list(flagged)}
                    </p>
                  </div>
                </div>
              )}

              {/* Save status hint */}
              {(pending > 0 || failing > 0) && !error && (
                <p className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-neutral-400">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      failing > 0
                        ? "animate-pulse bg-amber-400"
                        : "animate-pulse bg-indigo-400"
                    }`}
                  />
                  {failing > 0
                    ? "Some answers are not saved yet."
                    : "Finishing saving your answers…"}
                </p>
              )}

              {/* Error */}
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="mt-0.5 h-4 w-4 flex-shrink-0"
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="6.25"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M8 5v3.5M8 11h.01"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{error}</span>
                </p>
              )}
            </div>

            {/* ============ FOOTER ============ */}
            <div className="flex flex-wrap justify-end gap-2 border-t border-white/5 px-6 py-4">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep working
              </button>

              {offerForce && (
                <button
                  type="button"
                  onClick={() => void submit(true)}
                  disabled={submitting}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/[0.06] px-5 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit anyway
                </button>
              )}

              <button
                type="button"
                onClick={() => void submit(false)}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting…
                  </>
                ) : error ? (
                  "Try again"
                ) : (
                  "Submit exam"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}