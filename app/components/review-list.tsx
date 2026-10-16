import type { ReviewQuestion } from "@/lib/review-builder";
import { Markdown } from "./markdown";

export function ReviewList({
  review,
  adminView = false,
}: {
  review: ReviewQuestion[];
  adminView?: boolean;
}) {
  const hasShortAnswer = review.some((q) => q.type === "SHORT_ANSWER");

  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            {adminView ? "Answer key" : "Question review"}
          </h2>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          {review.length} question{review.length === 1 ? "" : "s"} reviewed.
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {review.map((q) => {
          const tone =
            q.status === "CORRECT"
              ? "correct"
              : q.status === "INCORRECT"
                ? "incorrect"
                : "unanswered";

          return (
            <li key={q.id}>
              <article
                className={`rounded-2xl border p-6 backdrop-blur ${
                  tone === "correct"
                    ? "border-emerald-400/15 bg-emerald-500/[0.02]"
                    : tone === "incorrect"
                      ? "border-rose-400/15 bg-rose-500/[0.02]"
                      : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {/* ============ QUESTION HEADER ============ */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border text-[12px] font-bold tabular-nums ${
                        tone === "correct"
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                          : tone === "incorrect"
                            ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
                            : "border-white/10 bg-white/[0.04] text-neutral-400"
                      }`}
                    >
                      {q.number}
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                        Question {q.number}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-neutral-400">
                      {q.pointsAwarded} of {q.pointsPossible} point
                      {Number(q.pointsPossible) === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <StatusPill status={q.status} />
                </div>

                {/* ============ PROMPT ============ */}
                <div className="prose prose-invert prose-neutral max-w-none prose-headings:tracking-tight prose-headings:text-white prose-p:text-neutral-200 prose-p:leading-relaxed prose-a:text-violet-300 prose-strong:text-white prose-code:text-violet-200 prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-li:text-neutral-200">
                  <Markdown>{q.prompt}</Markdown>
                </div>

                {/* ============ IMAGE ============ */}
                {q.imageId && (
                  <div className="mt-4 inline-flex max-w-full rounded-xl border border-white/10 bg-white/[0.02] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/exam-images/${q.imageId}`}
                      alt={q.imageAlt ?? ""}
                      className="max-h-96 max-w-full rounded-lg object-contain"
                    />
                  </div>
                )}

                {/* ============ OPTIONS or SHORT ANSWER ============ */}
                {q.type !== "SHORT_ANSWER" ? (
                  <ul className="mt-5 flex flex-col gap-2">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${
                          o.right
                            ? "border-emerald-400/40 bg-emerald-500/[0.08] text-emerald-100"
                            : o.chosen
                              ? "border-rose-400/30 bg-rose-500/[0.06] text-rose-100"
                              : "border-white/10 bg-white/[0.02] text-neutral-300"
                        }`}
                      >
                        {/* Indicator */}
                        <span
                          className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border ${
                            o.right
                              ? "border-emerald-400 bg-emerald-500"
                              : o.chosen
                                ? "border-rose-400 bg-rose-500"
                                : "border-white/20 bg-white/[0.04]"
                          }`}
                        >
                          {o.right && (
                            <svg
                              aria-hidden
                              viewBox="0 0 16 16"
                              fill="none"
                              className="h-2.5 w-2.5"
                            >
                              <path
                                d="M3.5 8.5 6.5 11.5 12.5 5"
                                stroke="white"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          {o.chosen && !o.right && (
                            <svg
                              aria-hidden
                              viewBox="0 0 16 16"
                              fill="none"
                              className="h-2.5 w-2.5"
                            >
                              <path
                                d="M5 5l6 6M11 5l-6 6"
                                stroke="white"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          )}
                        </span>

                        <span className="min-w-0 flex-1">{o.text}</span>

                        {o.chosen && (
                          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-neutral-300">
                            {adminView ? "Student's answer" : "Your answer"}
                          </span>
                        )}
                        {o.right && (
                          <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                            Correct answer
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div
                      className={`rounded-xl border px-4 py-3 ${
                        tone === "correct"
                          ? "border-emerald-400/30 bg-emerald-500/[0.06]"
                          : tone === "incorrect"
                            ? "border-rose-400/30 bg-rose-500/[0.06]"
                            : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                        {adminView ? "Student's answer" : "Your answer"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-200">
                        {q.givenText && q.givenText.trim() !== ""
                          ? q.givenText
                          : "(none)"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] px-4 py-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-300/80">
                        Accepted answers
                      </p>
                      <p className="mt-1 text-sm text-neutral-200">
                        {q.acceptedList.join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                {/* ============ EXPLANATION ============ */}
                {q.explanation && (
                  <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-500/[0.04] px-4 py-4">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300">
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3 w-3"
                      >
                        <path
                          d="M4 3.5h8v9l-4-2.5-4 2.5v-9Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Explanation
                    </p>
                    <div className="prose prose-invert prose-neutral max-w-none prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:text-sm prose-headings:text-white prose-strong:text-white prose-code:text-violet-200 prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-li:text-neutral-300">
                      <Markdown>{q.explanation}</Markdown>
                    </div>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ============================================================
   StatusPill — colored dot + label
   ============================================================ */
function StatusPill({
  status,
}: {
  status: "CORRECT" | "INCORRECT" | "UNANSWERED";
}) {
  if (status === "CORRECT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Correct
      </span>
    );
  }
  if (status === "INCORRECT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Incorrect
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
      <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
      Not answered
    </span>
  );
}