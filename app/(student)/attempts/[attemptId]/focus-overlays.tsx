"use client";

import type { FocusWarning, Monitoring } from "./use-focus-monitor";

export function FocusOverlays({
  monitoring,
  warning,
  dismissWarning,
  needsFullscreen,
  enterFullscreen,
}: {
  monitoring: Monitoring;
  warning: FocusWarning | null;
  dismissWarning: () => void;
  needsFullscreen: boolean;
  enterFullscreen: () => void;
}) {
  const consequence =
    monitoring.policy === "AUTO_SUBMIT"
      ? "your exam will end and be submitted"
      : "your exam will be flagged for your tutor to review";

  return (
    <>
      {/* ============ FULLSCREEN REQUIRED ============ */}
      {needsFullscreen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="fs-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <div className="border-b border-white/5 px-6 pb-5 pt-6">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-400" />
                <h2
                  id="fs-title"
                  className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300"
                >
                  Fullscreen required
                </h2>
              </div>

              <p className="mt-3 text-base leading-relaxed text-neutral-300">
                This exam must be taken in fullscreen.
              </p>
              <p className="mt-2 flex items-center gap-2 text-xs text-amber-300/80">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5 flex-shrink-0"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M8 4.5V8l2 1.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                Your timer is still running.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-white/5 px-6 py-4">
              <button
                type="button"
                onClick={enterFullscreen}
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
              >
                Enter fullscreen
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
            </div>
          </div>
        </div>
      )}

      {/* ============ FOCUS WARNING / FLAG ============ */}
      {warning && !needsFullscreen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="warn-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <div className="border-b border-white/5 px-6 pb-5 pt-6">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    warning.action === "FLAG"
                      ? "bg-gradient-to-br from-rose-400 to-fuchsia-400"
                      : "bg-gradient-to-br from-amber-400 to-orange-400"
                  }`}
                />
                <h2
                  id="warn-title"
                  className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300"
                >
                  {warning.action === "FLAG"
                    ? "Exam flagged"
                    : "You left the exam page"}
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-4 px-6 py-5">
              {warning.action === "WARN" ? (
                <>
                  {/* Warning counter */}
                  <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3.5">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-4 w-4"
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
                        Warning {warning.count} of {warning.limit}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-amber-300/80">
                        Leaving the exam page is recorded.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-neutral-300">
                    If you leave again after {warning.limit} warning
                    {warning.limit === 1 ? "" : "s"}, {consequence}.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3.5">
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-300">
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-4 w-4"
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
                      <p className="text-sm font-medium text-rose-200">
                        Flagged for review
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-rose-300/80">
                        Your tutor will see this in the attempt log.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-neutral-300">
                    You left the exam page more than {warning.limit} time
                    {warning.limit === 1 ? "" : "s"}. You can keep going.
                  </p>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-white/5 px-6 py-4">
              <button
                type="button"
                onClick={dismissWarning}
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
              >
                Continue my exam
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}