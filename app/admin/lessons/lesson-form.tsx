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
  const field = "w-full rounded border px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {lesson && <input type="hidden" name="id" value={lesson.id} />}

      <div>
        <label htmlFor="title" className={label}>Title</label>
        <input id="title" name="title" required maxLength={150} className={field}
          value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label htmlFor="description" className={label}>Short description</label>
        <textarea id="description" name="description" rows={2} maxLength={500} className={field}
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="subjectId" className={label}>Subject</label>
          <select id="subjectId" name="subjectId" required className={field}
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setCategoryId("");
            }}>
            <option value="" disabled>Select...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="categoryId" className={label}>Category (optional)</label>
          <select id="categoryId" name="categoryId" className={field}
            value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="estimatedMinutes" className={label}>Estimated minutes</label>
          <input id="estimatedMinutes" name="estimatedMinutes" type="number" min={1} max={600}
            className={field} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
      </div>

      <div>
        <label htmlFor="objectives" className={label}>
          Learning objectives (one per line, up to 10)
        </label>
        <textarea id="objectives" name="objectives" rows={4} className={field}
          value={objectives} onChange={(e) => setObjectives(e.target.value)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="content" className={label}>Lesson content (Markdown)</label>
          <textarea id="content" name="content" rows={18} className={`${field} font-mono text-sm`}
            value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <div>
          <p className={label}>Preview</p>
          <div className="min-h-[24rem] rounded border p-4">
            {content.trim() ? (
              <Markdown>{content}</Markdown>
            ) : (
              <p className="text-sm text-gray-500">Nothing to preview yet.</p>
            )}
          </div>
        </div>
      </div>

      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${
            state.ok
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending}
        className="self-start rounded bg-black px-5 py-2 text-white disabled:opacity-50">
        {pending ? "Saving..." : lesson ? "Save changes" : "Create draft"}
      </button>
    </form>
  );
}