"use client";

import { useActionState, useState } from "react";

import { MAX_OPTIONS, MIN_OPTIONS, TYPE_LABELS, type QuestionTypeValue } from "@/lib/question-input";
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
};

const initialState: QuestionFormState = { ok: false, message: null };

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

  const isChoice = type === "SINGLE_CHOICE" || type === "MULTIPLE_SELECT";
  const field = "w-full rounded border px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  function setCorrect(index: number, checked: boolean) {
    setOptions((current) =>
      current.map((option, i) =>
        type === "SINGLE_CHOICE" ? { ...option, correct: i === index } : i === index ? { ...option, correct: checked } : option
      )
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="type" value={type} />
      {initial && <input type="hidden" name="questionId" value={initial.questionId} />}

      <p className="text-sm text-gray-600">Type: <strong>{TYPE_LABELS[type]}</strong></p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="prompt" className={label}>Question (Markdown)</label>
            <textarea id="prompt" name="prompt" rows={7} required className={`${field} font-mono text-sm`}
              value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="points" className={label}>Points (for example 1 or 0.5)</label>
              <input id="points" name="points" inputMode="decimal" required className={field}
                value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
            <div>
              <label htmlFor="categoryId" className={label}>Topic (optional)</label>
              <select id="categoryId" name="categoryId" className={field}
                value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {isChoice && (
            <fieldset className="flex flex-col gap-2 rounded border p-4">
              <legend className="px-1 text-sm font-medium">
                Answer options ({type === "SINGLE_CHOICE" ? "pick the one correct option" : "tick every correct option"})
              </legend>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type={type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                    name={`correct-ui-${type}`}
                    checked={option.correct}
                    onChange={(e) => setCorrect(index, e.target.checked)}
                    aria-label={`Option ${index + 1} is correct`}
                  />
                  <input
                    className={field}
                    aria-label={`Option ${index + 1} text`}
                    maxLength={300}
                    value={option.text}
                    onChange={(e) =>
                      setOptions((cur) => cur.map((o, i) => (i === index ? { ...o, text: e.target.value } : o)))
                    }
                  />
                  <input type="hidden" name="optionText" value={option.text} />
                  {option.correct && <input type="hidden" name="correctIndex" value={index} />}
                  <button type="button" disabled={options.length <= MIN_OPTIONS}
                    onClick={() => setOptions((cur) => cur.filter((_, i) => i !== index))}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-40">
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" disabled={options.length >= MAX_OPTIONS}
                onClick={() => setOptions((cur) => [...cur, { text: "", correct: false }])}
                className="self-start rounded border px-3 py-1 text-sm disabled:opacity-40">
                Add option
              </button>
            </fieldset>
          )}

          {type === "TRUE_FALSE" && (
            <fieldset className="flex gap-6 rounded border p-4 text-sm">
              <legend className="px-1 font-medium">The statement is</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="trueFalseCorrect" value="true" checked={trueFalse === "true"}
                  onChange={() => setTrueFalse("true")} /> True
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="trueFalseCorrect" value="false" checked={trueFalse === "false"}
                  onChange={() => setTrueFalse("false")} /> False
              </label>
            </fieldset>
          )}

          {type === "SHORT_ANSWER" && (
            <div>
              <label htmlFor="acceptedAnswers" className={label}>
                Accepted answers (one per line, up to 10)
              </label>
              <textarea id="acceptedAnswers" name="acceptedAnswers" rows={4} className={field}
                value={accepted} onChange={(e) => setAccepted(e.target.value)} />
              <p className="mt-1 text-xs text-gray-500">
                Matching ignores capital letters and extra spaces. List every spelling or format you accept, for
                example both 45 and 45.00.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="explanation" className={label}>Explanation shown after release (Markdown, optional)</label>
            <textarea id="explanation" name="explanation" rows={3} className={`${field} font-mono text-sm`}
              value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>
        </div>

        <div>
          <p className={label}>Preview (as students will read it)</p>
          <div className="flex min-h-[16rem] flex-col gap-4 rounded border p-4">
            {prompt.trim() ? <Markdown>{prompt}</Markdown> : <p className="text-sm text-gray-500">Nothing to preview yet.</p>}

            {isChoice && (
              <ul className="flex flex-col gap-2 text-sm">
                {options.filter((o) => o.text.trim() !== "").map((o, i) => (
                  <li key={i} className="flex items-center gap-2 rounded border p-2">
                    <span aria-hidden="true">{type === "SINGLE_CHOICE" ? "( )" : "[ ]"}</span> {o.text}
                  </li>
                ))}
              </ul>
            )}
            {type === "TRUE_FALSE" && (
              <ul className="flex flex-col gap-2 text-sm">
                <li className="rounded border p-2">( ) True</li>
                <li className="rounded border p-2">( ) False</li>
              </ul>
            )}
            {type === "SHORT_ANSWER" && (
              <div className="rounded border border-dashed p-2 text-sm text-gray-500">Student types an answer here</div>
            )}
            <p className="text-xs text-gray-500">Worth {points || "?"} point(s). The answer key is never shown to students.</p>
          </div>
        </div>
      </div>

      {state.message && (
        <p role={state.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${
            state.ok ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"
          }`}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending}
        className="self-start rounded bg-black px-5 py-2 text-white disabled:opacity-50">
        {pending ? "Saving..." : initial ? "Save question" : "Add question"}
      </button>
    </form>
  );
}