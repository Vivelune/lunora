"use client";

import { useActionState, useState } from "react";

import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  TYPE_LABELS,
  type QuestionTypeValue,
} from "@/lib/question-input";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { saveQuestion, type QuestionFormState } from "../../question-actions";
import { Markdown } from "@/app/components/markdown";

export type QuestionInitial = {
  questionId: string;
  prompt: string;
  points: string;
  explanation: string;
  categoryId: string;
  options: { text: string; correct: boolean }[];
  trueFalseCorrect: string;
  acceptedAnswers: string;
  imageId: string;
  imageAlt: string;
};

const initialState: QuestionFormState = { ok: false, message: null };

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export function QuestionForm({
  examId,
  type,
  categories,
  initial,
}: {
  examId: string;
  type: QuestionTypeValue;
  categories: { id: string; name: string }[];
  initial?: QuestionInitial;
}) {
  const [state, formAction, pending] = useActionState(saveQuestion, initialState);

  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [points, setPoints] = useState(initial?.points ?? "1");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [options, setOptions] = useState(
    initial?.options.length
      ? initial.options
      : [
          { text: "", correct: false },
          { text: "", correct: false },
          { text: "", correct: false },
          { text: "", correct: false },
        ]
  );
  const [trueFalse, setTrueFalse] = useState(initial?.trueFalseCorrect ?? "");
  const [accepted, setAccepted] = useState(initial?.acceptedAnswers ?? "");

  const [imageId, setImageId] = useState(initial?.imageId ?? "");
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isChoice = type === "SINGLE_CHOICE" || type === "MULTIPLE_SELECT";

  function setCorrect(index: number, checked: boolean) {
    setOptions((current) =>
      current.map((option, i) =>
        type === "SINGLE_CHOICE"
          ? { ...option, correct: i === index }
          : i === index
            ? { ...option, correct: checked }
            : option
      )
    );
  }

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("The image must be 4 MB or smaller");
      input.value = "";
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/exam-images", {
        method: "POST",
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.id !== "string") {
        setUploadError(result.error ?? "Upload failed");
        return;
      }
      setImageId(result.id);
    } catch {
      setUploadError("Could not reach the server. Try again.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="imageId" value={imageId} />
      <input type="hidden" name="imageAlt" value={imageId ? imageAlt : ""} />
      {initial && <input type="hidden" name="questionId" value={initial.questionId} />}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ============ LEFT COLUMN — EDITOR ============ */}
        <div className="flex flex-col gap-5">
          {/* Prompt */}
          <div>
            <label htmlFor="prompt" className={labelBase}>
              Question
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                Markdown
              </span>
            </label>
            <textarea
              id="prompt"
              name="prompt"
              rows={7}
              required
              className={`${inputBase} font-mono text-[13px] leading-relaxed`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Write the question students will see…"
            />
          </div>

          {/* Image upload */}
          <fieldset className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <legend className="flex items-center gap-2 px-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Image
              </span>
              <span className="ml-1 text-[10px] font-normal tracking-normal text-neutral-500">
                optional
              </span>
            </legend>

            {imageId ? (
              <>
                {/* Preview */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/exam-images/${imageId}`}
                  alt={imageAlt || "Question image"}
                  className="max-h-48 self-start rounded-xl border border-white/10"
                />

                {/* Alt text */}
                <div>
                  <label htmlFor="imageAltInput" className={labelBase}>
                    Image description
                    <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                      required · for screen readers
                    </span>
                  </label>
                  <input
                    id="imageAltInput"
                    className={inputBase}
                    maxLength={200}
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="Describe what the image shows."
                  />
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => {
                    setImageId("");
                    setImageAlt("");
                  }}
                  className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-full border border-transparent px-3.5 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/20 hover:bg-rose-500/[0.08]"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      d="M5 5l6 6M11 5l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Remove image
                </button>
              </>
            ) : (
              <div>
                <input
                  id="imageFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onPickFile}
                  disabled={uploading}
                  className="sr-only"
                />

                <label
                  htmlFor="imageFile"
                  className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] transition-colors ${
                    uploading
                      ? "cursor-wait opacity-60"
                      : "hover:border-violet-400/40 hover:bg-white/[0.04]"
                  }`}
                >
                  {uploading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
                      <span className="text-xs text-neutral-400">
                        Uploading…
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400">
                        <svg
                          aria-hidden
                          viewBox="0 0 16 16"
                          fill="none"
                          className="h-4 w-4"
                        >
                          <rect
                            x="2.5"
                            y="3.5"
                            width="11"
                            height="9"
                            rx="1.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <circle cx="6" cy="7" r="1" fill="currentColor" />
                          <path
                            d="M3.5 11.5 6.5 9l2 2 2-2.5 2 3"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="text-xs text-neutral-400">
                        Click to upload
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        PNG, JPEG or WebP · up to 4 MB
                      </span>
                    </>
                  )}
                </label>
              </div>
            )}

            {uploadError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200"
              >
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
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 5v3.5M8 11h.01"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{uploadError}</span>
              </p>
            )}
          </fieldset>

          {/* Points + category */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="points" className={labelBase}>
                Points
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  e.g. 1 or 0.5
                </span>
              </label>
              <input
                id="points"
                name="points"
                inputMode="decimal"
                required
                className={inputBase}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="categoryId" className={labelBase}>
                Topic
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  optional
                </span>
              </label>
              <select
                id="categoryId"
                name="categoryId"
                className={inputBase}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Answer options for choice types */}
          {isChoice && (
            <fieldset className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <legend className="flex items-center gap-2 px-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
                  Answer options
                </span>
                <span className="ml-1 text-[10px] font-normal tracking-normal text-neutral-500">
                  {type === "SINGLE_CHOICE"
                    ? "pick the one correct option"
                    : "tick every correct option"}
                </span>
              </legend>

              <div className="flex flex-col gap-2.5">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <label className="grid h-6 w-6 flex-shrink-0 cursor-pointer place-items-center">
                      <input
                        type={type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                        name={`correct-ui-${type}`}
                        checked={option.correct}
                        onChange={(e) => setCorrect(index, e.target.checked)}
                        aria-label={`Option ${index + 1} is correct`}
                        className="h-4 w-4 cursor-pointer rounded-full border-white/20 bg-white/[0.04] accent-violet-500"
                      />
                    </label>

                    <input
                      className={`${inputBase} min-w-0 flex-1`}
                      aria-label={`Option ${index + 1} text`}
                      maxLength={300}
                      value={option.text}
                      onChange={(e) =>
                        setOptions((cur) =>
                          cur.map((o, i) =>
                            i === index ? { ...o, text: e.target.value } : o
                          )
                        )
                      }
                      placeholder={`Option ${index + 1}`}
                    />

                    <input type="hidden" name="optionText" value={option.text} />
                    {option.correct && (
                      <input type="hidden" name="correctIndex" value={index} />
                    )}

                    <button
                      type="button"
                      disabled={options.length <= MIN_OPTIONS}
                      onClick={() =>
                        setOptions((cur) => cur.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove option ${index + 1}`}
                      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3.5 w-3.5"
                      >
                        <path
                          d="M5 5l6 6M11 5l-6 6"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={options.length >= MAX_OPTIONS}
                onClick={() =>
                  setOptions((cur) => [...cur, { text: "", correct: false }])
                }
                className="group mt-1 inline-flex h-9 w-fit items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-neutral-200 transition-colors hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5"
                >
                  <path
                    d="M8 3.5v9M3.5 8h9"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Add option
              </button>
            </fieldset>
          )}

          {/* True / False */}
          {type === "TRUE_FALSE" && (
            <fieldset className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <legend className="flex items-center gap-2 px-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
                  The statement is
                </span>
              </legend>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                    trueFalse === "true"
                      ? "border-violet-400/40 bg-violet-500/[0.08] text-white"
                      : "border-white/10 bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="trueFalseCorrect"
                    value="true"
                    checked={trueFalse === "true"}
                    onChange={() => setTrueFalse("true")}
                    className="h-4 w-4 cursor-pointer accent-violet-500"
                  />
                  <span className="font-medium">True</span>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                    trueFalse === "false"
                      ? "border-violet-400/40 bg-violet-500/[0.08] text-white"
                      : "border-white/10 bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="trueFalseCorrect"
                    value="false"
                    checked={trueFalse === "false"}
                    onChange={() => setTrueFalse("false")}
                    className="h-4 w-4 cursor-pointer accent-violet-500"
                  />
                  <span className="font-medium">False</span>
                </label>
              </div>
            </fieldset>
          )}

          {/* Short answer */}
          {type === "SHORT_ANSWER" && (
            <div>
              <label htmlFor="acceptedAnswers" className={labelBase}>
                Accepted answers
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                  one per line · up to 10
                </span>
              </label>
              <textarea
                id="acceptedAnswers"
                name="acceptedAnswers"
                rows={4}
                className={`${inputBase} font-mono text-[13px]`}
                value={accepted}
                onChange={(e) => setAccepted(e.target.value)}
                placeholder={"45\n45.0\n45.00"}
              />
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
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
                Matching ignores capital letters and extra spaces. List every
                spelling or format you accept, for example both 45 and 45.00.
              </p>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label htmlFor="explanation" className={labelBase}>
              Explanation
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                Markdown · optional
              </span>
            </label>
            <textarea
              id="explanation"
              name="explanation"
              rows={3}
              className={`${inputBase} font-mono text-[13px] leading-relaxed`}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Shown to students after the exam is released."
            />
          </div>
        </div>

        {/* ============ RIGHT COLUMN — PREVIEW ============ */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className={labelBase}>Preview</p>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                As students will read it
              </p>
            </div>

            <div className="flex min-h-[16rem] flex-col gap-5">
              {prompt.trim() ? (
                <div className="prose prose-invert prose-neutral max-w-none prose-headings:tracking-tight prose-headings:text-white prose-p:text-neutral-200 prose-p:leading-relaxed prose-a:text-violet-300 prose-strong:text-white prose-code:text-violet-200 prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-li:text-neutral-200">
                  <Markdown>{prompt}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">
                  Nothing to preview yet.
                </p>
              )}

              {imageId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/exam-images/${imageId}`}
                  alt={imageAlt || "Question image"}
                  className="max-w-full self-start rounded-xl border border-white/10"
                />
              )}

              {isChoice && (
                <ul className="flex flex-col gap-2">
                  {options
                    .filter((o) => o.text.trim() !== "")
                    .map((o, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200"
                      >
                        <span
                          className={`grid h-4 w-4 flex-shrink-0 place-items-center border border-white/20 bg-white/[0.04] ${
                            type === "SINGLE_CHOICE" ? "rounded-full" : "rounded"
                          }`}
                        />
                        <span>{o.text}</span>
                      </li>
                    ))}
                  {options.filter((o) => o.text.trim() !== "").length === 0 && (
                    <li className="text-xs text-neutral-500">
                      Add options to see them here.
                    </li>
                  )}
                </ul>
              )}

              {type === "TRUE_FALSE" && (
                <ul className="flex flex-col gap-2">
                  <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200">
                    <span className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border border-white/20 bg-white/[0.04]" />
                    True
                  </li>
                  <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-neutral-200">
                    <span className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border border-white/20 bg-white/[0.04]" />
                    False
                  </li>
                </ul>
              )}

              {type === "SHORT_ANSWER" && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm text-neutral-500">
                  Student types an answer here
                </div>
              )}

              <p className="mt-auto flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
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
                Worth {points || "?"} point(s). The answer key is never shown
                to students.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ STATUS MESSAGE ============ */}
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-200"
              : "border-rose-400/20 bg-rose-500/[0.06] text-rose-200"
          }`}
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            {state.ok ? (
              <path
                d="M3.5 8.5 6.5 11.5 12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <>
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
              </>
            )}
          </svg>
          <span>{state.message}</span>
        </p>
      )}

      {/* ============ SUBMIT ============ */}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
        <button
          type="submit"
          disabled={pending || uploading}
          className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving…
            </>
          ) : (
            <>
              {initial ? "Save question" : "Add question"}
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
            </>
          )}
        </button>

        {uploading && (
          <p className="inline-flex items-center gap-2 text-xs text-neutral-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
            Waiting for image upload to finish…
          </p>
        )}

        {!uploading && (
          <p className="text-xs text-neutral-500">
            {initial
              ? "Changes take effect immediately in the working version."
              : "New questions are added to the end of the working version."}
          </p>
        )}
      </div>
    </form>
  );
}