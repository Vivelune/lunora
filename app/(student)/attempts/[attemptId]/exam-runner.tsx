"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentQuestion } from "@/lib/exam-student-safe";
import {
  useAnswerSaver,
  type AnswerState,
  type ServerAnswer,
} from "./use-answer-saver";
import { Markdown } from "@/app/components/markdown";

export type InitialAnswer = AnswerState & { revision: number };

const HEARTBEAT_MS = 30_000;
const TEXT_DEBOUNCE_MS = 800;

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const EMPTY: AnswerState = {
  selectedOptionIds: [],
  textAnswer: "",
  flagged: false,
};

const isAnswered = (a: AnswerState | undefined) =>
  !!a && (a.selectedOptionIds.length > 0 || a.textAnswer.trim() !== "");

export function ExamRunner({
  attemptId,
  title,
  instructions,
  questions,
  initialAnswers,
  deadlineAt,
  serverNow,
}: {
  attemptId: string;
  title: string;
  instructions: string | null;
  questions: StudentQuestion[];
  initialAnswers: Record<string, InitialAnswer>;
  deadlineAt: string;
  serverNow: string;
}) {
  const router = useRouter();

  const [current, setCurrent] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const start: Record<string, AnswerState> = {};
    for (const [questionId, a] of Object.entries(initialAnswers)) {
      start[questionId] = {
        selectedOptionIds: a.selectedOptionIds,
        textAnswer: a.textAnswer,
        flagged: a.flagged,
      };
    }
    return start;
  });

  const saver = useAnswerSaver({
    attemptId,
    initialRevisions: Object.fromEntries(
      Object.entries(initialAnswers).map(([id, a]) => [id, a.revision])
    ),
    onConflict: (questionId: string, serverAnswer: ServerAnswer) => {
      setAnswers((cur) => ({
        ...cur,
        [questionId]: {
          selectedOptionIds: serverAnswer.selectedOptionIds,
          textAnswer: serverAnswer.textAnswer,
          flagged: serverAnswer.flagged,
        },
      }));
      const number = questions.findIndex((q) => q.id === questionId) + 1;
      setNotice(
        `Question ${number} was changed somewhere else (another tab?). Showing the latest saved answer.`
      );
    },
    onEnded: () => router.refresh(),
  });

  // The deadline comes from the server. The clock offset corrects for a wrong local clock.
  const deadlineMs = useRef(Date.parse(deadlineAt));
  const offsetMs = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [connectionOk, setConnectionOk] = useState(true);

  const sendHeartbeat = useCallback(
    async (reason: "load" | "tick") => {
      try {
        const response = await fetch(`/api/attempts/${attemptId}/heartbeat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        if (!response.ok) throw new Error("bad status");
        const data = await response.json();
        offsetMs.current = Date.parse(data.serverNow) - Date.now();
        deadlineMs.current = Date.parse(data.deadlineAt);
        setConnectionOk(true);
        if (data.status !== "IN_PROGRESS") {
          router.refresh();
        }
      } catch {
        setConnectionOk(false);
      }
    },
    [attemptId, router]
  );

  useEffect(() => {
    offsetMs.current = Date.parse(serverNow) - Date.now();
    const compute = () =>
      Math.max(
        0,
        Math.ceil(
          (deadlineMs.current - (Date.now() + offsetMs.current)) / 1000
        )
      );

    setRemaining(compute());
    void sendHeartbeat("load");

    const tick = setInterval(() => setRemaining(compute()), 1000);
    const beat = setInterval(
      () => void sendHeartbeat("tick"),
      HEARTBEAT_MS
    );
    return () => {
      clearInterval(tick);
      clearInterval(beat);
    };
  }, [serverNow, sendHeartbeat]);

  const timeUp = remaining === 0;

  // After time is up, keep asking the server until it ends the attempt (after the short grace).
  useEffect(() => {
    if (!timeUp) return;
    const poll = setInterval(() => void sendHeartbeat("tick"), 3000);
    return () => clearInterval(poll);
  }, [timeUp, sendHeartbeat]);

  const question = questions[current];
  const answer = answers[question.id] ?? EMPTY;

  /** Updates the screen at once and hands the change to the saving engine. */
  function commit(
    questionId: string,
    change: Partial<AnswerState>,
    delayMs: number
  ) {
    const next: AnswerState = {
      ...(answers[questionId] ?? EMPTY),
      ...change,
    };
    setAnswers((cur) => ({ ...cur, [questionId]: next }));
    saver.schedule(questionId, next, delayMs);
  }

  function goTo(index: number) {
    saver.flush(question.id);
    setCurrent(Math.max(0, Math.min(questions.length - 1, index)));
  }

  function chooseSingle(optionId: string) {
    commit(question.id, { selectedOptionIds: [optionId] }, 0);
  }

  function toggleMulti(optionId: string) {
    const selected = answer.selectedOptionIds;
    commit(
      question.id,
      {
        selectedOptionIds: selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      },
      0
    );
  }

  const answeredCount = questions.filter((q) =>
    isAnswered(answers[q.id])
  ).length;
  const flaggedCount = questions.filter(
    (q) => answers[q.id]?.flagged
  ).length;

  const clockTone =
    remaining !== null && remaining <= 60
      ? "critical"
      : remaining !== null && remaining <= 300
        ? "warning"
        : "normal";

  const clockTextClass =
    clockTone === "critical"
      ? "text-rose-300"
      : clockTone === "warning"
        ? "text-amber-300"
        : "text-white";

  const clockBorderClass =
    clockTone === "critical"
      ? "border-rose-400/30 bg-rose-500/10"
      : clockTone === "warning"
        ? "border-amber-400/30 bg-amber-500/10"
        : "border-white/10 bg-white/[0.03]";

  const questionStatus = saver.statusOf(question.id);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      {/* ============ STICKY HEADER ============ */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3 sm:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
              {title}
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              Question{" "}
              <span className="tabular-nums text-neutral-400">
                {current + 1}
              </span>{" "}
              of{" "}
              <span className="tabular-nums text-neutral-400">
                {questions.length}
              </span>{" "}
              · {answeredCount} answered
              {flaggedCount > 0 && ` · ${flaggedCount} flagged`}
            </p>
          </div>

          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-2 ${clockBorderClass}`}
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className={`h-4 w-4 ${clockTextClass} opacity-70`}
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
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                Time left
              </p>
              <p
                role="timer"
                aria-live="off"
                className={`font-mono text-xl font-bold tabular-nums ${clockTextClass}`}
              >
                {remaining === null ? "--:--" : formatClock(remaining)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ============ STATUS BANNERS ============ */}
      {saver.failing > 0 ? (
        <p
          role="alert"
          className="flex items-center justify-center gap-2 border-b border-amber-400/20 bg-amber-500/[0.06] px-6 py-2 text-xs text-amber-200"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Some answers are not saved yet. Check your internet connection. We
          keep trying, and your timer keeps running.
        </p>
      ) : !connectionOk ? (
        <p
          role="alert"
          className="flex items-center justify-center gap-2 border-b border-amber-400/20 bg-amber-500/[0.06] px-6 py-2 text-xs text-amber-200"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Connection problem. Your timer keeps running. Reconnecting
          automatically…
        </p>
      ) : null}

      {timeUp && (
        <p
          role="alert"
          className="flex items-center justify-center gap-2 border-b border-rose-400/20 bg-rose-500/[0.06] px-6 py-2 text-xs text-rose-200"
        >
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
          Time is up. Finishing your exam…
        </p>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-4 border-b border-indigo-400/20 bg-indigo-500/[0.06] px-6 py-2.5 text-xs text-indigo-200"
        >
          <span className="flex items-start gap-2">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
            >
              <circle
                cx="8"
                cy="8"
                r="6.25"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M8 5v3M8 10.5h.01"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="flex-shrink-0 text-indigo-300 transition-colors hover:text-indigo-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============ SAVE STATUS STRIP ============ */}
      <div
        className="flex items-center justify-center gap-2 border-b border-white/5 bg-white/[0.02] px-6 py-2 text-[11px] text-neutral-500"
        aria-live="polite"
      >
        {saver.failing > 0 ? (
          <>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            <span className="text-amber-300">Not saved yet — retrying…</span>
          </>
        ) : saver.pending > 0 ? (
          <>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            <span>Saving…</span>
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            <span>All answers saved</span>
          </>
        )}
      </div>

      {/* ============ MAIN LAYOUT ============ */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 sm:p-8 lg:flex-row">
        {/* ============ QUESTION PANEL ============ */}
        <main className="flex flex-1 flex-col gap-5">
          {instructions && (
            <details className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur open:bg-white/[0.04]">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-neutral-200 transition-colors hover:text-white">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3 w-3 transition-transform group-open:rotate-90"
                >
                  <path
                    d="M6 3.5 10.5 8 6 12.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Instructions
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-400">
                {instructions}
              </p>
            </details>
          )}

          {/* Question card */}
          <section
            className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
            aria-label={`Question ${current + 1}`}
          >
            {/* Meta row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Question{" "}
                  <span className="tabular-nums">{current + 1}</span> ·{" "}
                  {question.points} point
                  {question.points === "1" ? "" : "s"}
                </p>
                {questionStatus === "error" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-amber-400" />
                    Not saved yet
                  </span>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium transition-colors hover:border-white/20 hover:bg-white/[0.06]">
                <input
                  type="checkbox"
                  checked={answer.flagged}
                  onChange={(e) =>
                    commit(question.id, { flagged: e.target.checked }, 0)
                  }
                  className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-amber-500"
                />
                <span
                  className={
                    answer.flagged ? "text-amber-300" : "text-neutral-400"
                  }
                >
                  Flag for review
                </span>
              </label>
            </div>

            {/* Prompt */}
            <div className="prose prose-invert prose-neutral max-w-none prose-headings:tracking-tight prose-headings:text-white prose-p:text-neutral-200 prose-p:leading-relaxed prose-a:text-violet-300 prose-strong:text-white prose-code:text-violet-200 prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-li:text-neutral-200">
              <Markdown>{question.prompt}</Markdown>
            </div>

            {/* Image */}
            {question.imageId && (
              <div className="inline-flex max-w-full rounded-xl border border-white/10 bg-white/[0.02] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/exam-images/${question.imageId}`}
                  alt={question.imageAlt ?? ""}
                  className="max-h-96 max-w-full rounded-lg object-contain"
                />
              </div>
            )}

            {/* Answer input — single choice / true-false */}
            {(question.type === "SINGLE_CHOICE" ||
              question.type === "TRUE_FALSE") && (
              <fieldset className="flex flex-col gap-2.5">
                <legend className="sr-only">Choose one answer</legend>
                {question.options.map((option) => {
                  const selected =
                    answer.selectedOptionIds[0] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors ${
                        selected
                          ? "border-violet-400/40 bg-violet-500/[0.08] text-white"
                          : "border-white/10 bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border ${
                          selected
                            ? "border-violet-400 bg-violet-500"
                            : "border-white/20 bg-white/[0.04]"
                        }`}
                      >
                        {selected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        checked={selected}
                        onChange={() => chooseSingle(option.id)}
                        className="sr-only"
                      />
                      <span className="min-w-0 flex-1">{option.text}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {/* Answer input — multiple select */}
            {question.type === "MULTIPLE_SELECT" && (
              <fieldset className="flex flex-col gap-2.5">
                <legend className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Select all that apply
                </legend>
                {question.options.map((option) => {
                  const selected = answer.selectedOptionIds.includes(
                    option.id
                  );
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors ${
                        selected
                          ? "border-violet-400/40 bg-violet-500/[0.08] text-white"
                          : "border-white/10 bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded border ${
                          selected
                            ? "border-violet-400 bg-violet-500"
                            : "border-white/20 bg-white/[0.04]"
                        }`}
                      >
                        {selected && (
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
                      </span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMulti(option.id)}
                        className="sr-only"
                      />
                      <span className="min-w-0 flex-1">{option.text}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {/* Answer input — short answer */}
            {question.type === "SHORT_ANSWER" && (
              <div>
                <label
                  htmlFor={`text-${question.id}`}
                  className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
                >
                  Your answer
                </label>
                <input
                  id={`text-${question.id}`}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  maxLength={200}
                  autoComplete="off"
                  value={answer.textAnswer}
                  onChange={(e) =>
                    commit(
                      question.id,
                      { textAnswer: e.target.value },
                      TEXT_DEBOUNCE_MS
                    )
                  }
                  onBlur={() => saver.flush(question.id)}
                  placeholder="Type your answer…"
                />
              </div>
            )}
          </section>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5"
              >
                <path
                  d="M13 8H3m0 0 4-4M3 8l4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Previous
            </button>

            <button
              type="button"
              onClick={() => goTo(current + 1)}
              disabled={current === questions.length - 1}
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
            >
              Next
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
        </main>

        {/* ============ SIDEBAR ============ */}
        <aside className="lg:w-64">
          <div className="lg:sticky lg:top-24">
            <nav
              aria-label="Question navigator"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
                  Questions
                </h2>
              </div>

              <ol className="grid grid-cols-5 gap-2 lg:grid-cols-4">
                {questions.map((q, index) => {
                  const a = answers[q.id];
                  const answered = isAnswered(a);
                  const flagged = !!a?.flagged;
                  const failed = saver.statusOf(q.id) === "error";
                  const isCurrent = index === current;

                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => goTo(index)}
                        aria-current={isCurrent ? "true" : undefined}
                        aria-label={`Question ${index + 1}, ${
                          answered ? "answered" : "not answered"
                        }${flagged ? ", flagged" : ""}${
                          failed ? ", not saved yet" : ""
                        }`}
                        className={`relative grid h-9 w-full place-items-center rounded-lg text-xs font-semibold transition-colors ${
                          isCurrent
                            ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"
                            : answered
                              ? "border border-violet-400/20 bg-violet-500/[0.08] text-violet-200 hover:bg-violet-500/[0.15]"
                              : "border border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-neutral-200"
                        }`}
                      >
                        <span className="tabular-nums">{index + 1}</span>

                        {flagged && (
                          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border border-amber-400/40 bg-amber-500/20 text-[9px] font-bold text-amber-300">
                            F
                          </span>
                        )}

                        {failed && (
                          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-amber-400/40 bg-amber-500/20 text-[10px] font-bold text-amber-300">
                            !
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Legend */}
              <ul className="mt-5 flex flex-col gap-2 border-t border-white/5 pt-4 text-[11px] text-neutral-500">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
                  Current
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border border-violet-400/20 bg-violet-500/[0.08]" />
                  Answered
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded border border-white/10 bg-white/[0.03]" />
                  Not answered
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-amber-400/40 bg-amber-500/20 text-[7px] font-bold text-amber-300">
                    F
                  </span>
                  Flagged
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-amber-400/40 bg-amber-500/20 text-[8px] font-bold text-amber-300">
                    !
                  </span>
                  Not saved yet
                </li>
              </ul>
            </nav>

            <button
              type="button"
              disabled
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] text-sm font-medium text-neutral-500 opacity-60"
            >
              Submit exam
              <span className="text-[10px] uppercase tracking-[0.14em] opacity-70">
                coming soon
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}