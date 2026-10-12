"use client";

import { useActionState, useState } from "react";
import {
  FOCUS_LABELS,
  FOCUS_POLICIES,
  RELEASE_LABELS,
  RELEASE_POLICIES,
} from "@/lib/exam-settings";
import { saveExamSettings, type ExamFormState } from "../actions";

export type SettingsInitial = {
  examId: string;
  instructions: string;
  durationMinutes: string;
  maxAttempts: string;
  passingPercent: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  resultRelease: string;
  explanationRelease: string;
  focusPolicy: string;
  maxFocusViolations: string;
  requireFullscreen: boolean;
};

const initialState: ExamFormState = { ok: false, message: null };

export function ExamSettingsForm({ initial }: { initial: SettingsInitial }) {
  const [state, formAction, pending] = useActionState(saveExamSettings, initialState);

  const [instructions, setInstructions] = useState(initial.instructions);
  const [duration, setDuration] = useState(initial.durationMinutes);
  const [attempts, setAttempts] = useState(initial.maxAttempts);
  const [passing, setPassing] = useState(initial.passingPercent);
  const [shuffleQuestions, setShuffleQuestions] = useState(initial.shuffleQuestions);
  const [shuffleOptions, setShuffleOptions] = useState(initial.shuffleOptions);
  const [resultRelease, setResultRelease] = useState(initial.resultRelease);
  const [explanationRelease, setExplanationRelease] = useState(initial.explanationRelease);
  const [focusPolicy, setFocusPolicy] = useState(initial.focusPolicy);
  const [violations, setViolations] = useState(initial.maxFocusViolations);
  const [fullscreen, setFullscreen] = useState(initial.requireFullscreen);

  const usesLimit = focusPolicy === "WARN_THEN_FLAG" || focusPolicy === "AUTO_SUBMIT";
  const field = "w-full rounded border px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="examId" value={initial.examId} />

      <div>
        <label htmlFor="instructions" className={label}>Instructions shown before the exam starts</label>
        <textarea id="instructions" name="instructions" rows={4} maxLength={5000} className={field}
          value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="durationMinutes" className={label}>Duration (minutes)</label>
          <input id="durationMinutes" name="durationMinutes" type="number" min={1} max={600} required
            className={field} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div>
          <label htmlFor="maxAttempts" className={label}>Maximum attempts</label>
          <input id="maxAttempts" name="maxAttempts" type="number" min={1} max={20} required
            className={field} value={attempts} onChange={(e) => setAttempts(e.target.value)} />
        </div>
        <div>
          <label htmlFor="passingPercent" className={label}>Passing mark % (optional)</label>
          <input id="passingPercent" name="passingPercent" type="number" min={1} max={100}
            className={field} value={passing} onChange={(e) => setPassing(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="shuffleQuestions" checked={shuffleQuestions}
            onChange={(e) => setShuffleQuestions(e.target.checked)} />
          Shuffle question order
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="shuffleOptions" checked={shuffleOptions}
            onChange={(e) => setShuffleOptions(e.target.checked)} />
          Shuffle answer options
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="resultRelease" className={label}>Release results</label>
          <select id="resultRelease" name="resultRelease" className={field}
            value={resultRelease} onChange={(e) => setResultRelease(e.target.value)}>
            {RELEASE_POLICIES.map((p) => <option key={p} value={p}>{RELEASE_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="explanationRelease" className={label}>Release explanations</label>
          <select id="explanationRelease" name="explanationRelease" className={field}
            value={explanationRelease} onChange={(e) => setExplanationRelease(e.target.value)}>
            {RELEASE_POLICIES.map((p) => <option key={p} value={p}>{RELEASE_LABELS[p]}</option>)}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3 rounded border p-4">
        <legend className="px-1 text-sm font-medium">Focus monitoring (enforced when students take exams)</legend>
        <div>
          <label htmlFor="focusPolicy" className={label}>When a student leaves the exam tab or window</label>
          <select id="focusPolicy" name="focusPolicy" className={field}
            value={focusPolicy} onChange={(e) => setFocusPolicy(e.target.value)}>
            {FOCUS_POLICIES.map((p) => <option key={p} value={p}>{FOCUS_LABELS[p]}</option>)}
          </select>
        </div>
        {usesLimit ? (
          <div>
            <label htmlFor="maxFocusViolations" className={label}>Violation limit (1 to 10)</label>
            <input id="maxFocusViolations" name="maxFocusViolations" type="number" min={1} max={10}
              className={field} value={violations} onChange={(e) => setViolations(e.target.value)} />
          </div>
        ) : (
          <input type="hidden" name="maxFocusViolations" value={violations} />
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requireFullscreen" checked={fullscreen}
            onChange={(e) => setFullscreen(e.target.checked)} />
          Ask students to take the exam in fullscreen
        </label>
        <p className="text-xs text-gray-500">
          Browsers cannot block students from switching tabs. This detects and records it for review.
        </p>
      </fieldset>

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
        {pending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}