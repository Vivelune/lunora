"use client";

import { useActionState, useState } from "react";
import { saveLesson, type LessonFormState } from "./actions";
import { Markdown } from "@/app/components/markdown";

export type SubjectOption = {
  id: string;
  label: string;
  categories: { id: string; name: string }[];
};

export type LessonInitial = {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  categoryId: string;
  objectives: string;
  content: string;
  estimatedMinutes: string;
};

const initialState: LessonFormState = { ok: false, message: null };

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export function LessonForm({
  subjects,
  lesson,
}: {
  subjects: SubjectOption[];
  lesson?: LessonInitial;
}) {
  const [state, formAction, pending] = useActionState(saveLesson, initialState);

  const [title, setTitle] = useState(lesson?.title ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");
  const [subjectId, setSubjectId] = useState(lesson?.subjectId ?? "");
  const [categoryId, setCategoryId] = useState(lesson?.categoryId ?? "");
  const [objectives, setObjectives] = useState(lesson?.objectives ?? "");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [minutes, setMinutes] = useState(lesson?.estimatedMinutes ?? "");

  const categories = subjects.find((s) => s.id === subjectId)?.categories ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {lesson && <input type="hidden" name="id" value={lesson.id} />}

      {/* ============ BASICS ============ */}
      <section className="flex flex-col gap-5">
        <div>
          <label htmlFor="title" className={labelBase}>
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={150}
            className={inputBase}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Balancing chemical equations"
          />
        </div>

        <div>
          <label htmlFor="description" className={labelBase}>
            Short description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            maxLength={500}
            className={inputBase}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A one-sentence summary students will see in the plan."
          />
        </div>
      </section>

      {/* ============ ORGANIZATION ============ */}
      <section className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="subjectId" className={labelBase}>
            Subject
          </label>
          <select
            id="subjectId"
            name="subjectId"
            required
            className={inputBase}
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setCategoryId("");
            }}
          >
            <option value="" disabled>
              Select…
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="categoryId" className={labelBase}>
            Category{" "}
            <span className="ml-1 text-[10px] tracking-normal text-neutral-500">
              optional
            </span>
          </label>
          <select
            id="categoryId"
            name="categoryId"
            className={inputBase}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!subjectId}
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="estimatedMinutes" className={labelBase}>
            Estimated minutes
          </label>
          <input
            id="estimatedMinutes"
            name="estimatedMinutes"
            type="number"
            min={1}
            max={600}
            className={inputBase}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="e.g. 20"
          />
        </div>
      </section>

      {/* ============ OBJECTIVES ============ */}
      <section>
        <label htmlFor="objectives" className={labelBase}>
          Learning objectives
          <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
            one per line · up to 10
          </span>
        </label>
        <textarea
          id="objectives"
          name="objectives"
          rows={4}
          className={inputBase}
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          placeholder={
            "Identify reactants and products\nApply conservation of mass\nBalance simple equations"
          }
        />
      </section>

      {/* ============ CONTENT + PREVIEW ============ */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <label htmlFor="content" className={labelBase}>
            Lesson content
            <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
              Markdown
            </span>
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Editor */}
          <div className="relative">
            <textarea
              id="content"
              name="content"
              rows={20}
              className={`${inputBase} min-h-[24rem] resize-y font-mono text-[13px] leading-relaxed`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Start writing…"
            />
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                Preview
              </p>
            </div>

            <div className="prose prose-invert prose-neutral max-w-none px-5 py-4 prose-headings:tracking-tight prose-headings:text-white prose-p:text-neutral-300 prose-p:leading-relaxed prose-a:text-violet-300 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-code:text-violet-200 prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-violet-400/40 prose-blockquote:text-neutral-400 prose-li:text-neutral-300">
              {content.trim() ? (
                <Markdown>{content}</Markdown>
              ) : (
                <p className="text-sm not-prose text-neutral-500">
                  Nothing to preview yet. Start typing in the editor.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

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
          disabled={pending}
          className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving…
            </>
          ) : (
            <>
              {lesson ? "Save changes" : "Create draft"}
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

        <p className="text-xs text-neutral-500">
          {lesson
            ? "Changes are visible to students as soon as they're published."
            : "New lessons start as drafts — publish them when they're ready."}
        </p>
      </div>
    </form>
  );
}