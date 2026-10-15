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

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

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

  const usesLimit =
    focusPolicy === "WARN_THEN_FLAG" || focusPolicy === "AUTO_SUBMIT";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="examId" value={initial.examId} />

      {/* ============ INSTRUCTIONS ============ */}
      <div>
        <label htmlFor="instructions" className={labelBase}>
          Instructions
          <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
            shown before the exam starts
          </span>
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={4}
          maxLength={5000}
          className={inputBase}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="What should students know before they begin?"
        />
      </div>

      {/* ============ TIMING / ATTEMPTS / PASSING ============ */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="durationMinutes" className={labelBase}>
            Duration
            <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
              minutes
            </span>
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            max={600}
            required
            className={inputBase}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="maxAttempts" className={labelBase}>
            Max attempts
          </label>
          <input
            id="maxAttempts"
            name="maxAttempts"
            type="number"
            min={1}
            max={20}
            required
            className={inputBase}
            value={attempts}
            onChange={(e) => setAttempts(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="passingPercent" className={labelBase}>
            Passing mark
            <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
              % · optional
            </span>
          </label>
          <input
            id="passingPercent"
            name="passingPercent"
            type="number"
            min={1}
            max={100}
            className={inputBase}
            value={passing}
            onChange={(e) => setPassing(e.target.value)}
          />
        </div>
      </div>

      {/* ============ SHUFFLE ============ */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow
          id="shuffleQuestions"
          name="shuffleQuestions"
          checked={shuffleQuestions}
          onChange={setShuffleQuestions}
          label="Shuffle question order"
        />
        <ToggleRow
          id="shuffleOptions"
          name="shuffleOptions"
          checked={shuffleOptions}
          onChange={setShuffleOptions}
          label="Shuffle answer options"
        />
      </div>

      {/* ============ RELEASE POLICY ============ */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="resultRelease" className={labelBase}>
            Release results
          </label>
          <select
            id="resultRelease"
            name="resultRelease"
            className={inputBase}
            value={resultRelease}
            onChange={(e) => setResultRelease(e.target.value)}
          >
            {RELEASE_POLICIES.map((p) => (
              <option key={p} value={p}>
                {RELEASE_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="explanationRelease" className={labelBase}>
            Release explanations
          </label>
          <select
            id="explanationRelease"
            name="explanationRelease"
            className={inputBase}
            value={explanationRelease}
            onChange={(e) => setExplanationRelease(e.target.value)}
          >
            {RELEASE_POLICIES.map((p) => (
              <option key={p} value={p}>
                {RELEASE_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ============ RELEASE POLICY NOTE ============ */}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
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
        <span>
          <strong className="font-medium text-neutral-400">
            &ldquo;After the deadline passes&rdquo;
          </strong>{" "}
          means after the last day to start plus the time limit, so nobody is
          still taking the exam. With no due date or end date, an admin has to
          release results. Explanations are never shown before results.
        </span>
      </p>

      {/* ============ FOCUS MONITORING ============ */}
      <fieldset className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <legend className="flex items-center gap-2 px-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-400" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Focus monitoring
          </span>
        </legend>

        <div>
          <label htmlFor="focusPolicy" className={labelBase}>
            When a student leaves the exam tab or window
          </label>
          <select
            id="focusPolicy"
            name="focusPolicy"
            className={inputBase}
            value={focusPolicy}
            onChange={(e) => setFocusPolicy(e.target.value)}
          >
            {FOCUS_POLICIES.map((p) => (
              <option key={p} value={p}>
                {FOCUS_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        {usesLimit ? (
          <div>
            <label htmlFor="maxFocusViolations" className={labelBase}>
              Violation limit
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                1 to 10
              </span>
            </label>
            <input
              id="maxFocusViolations"
              name="maxFocusViolations"
              type="number"
              min={1}
              max={10}
              className={inputBase}
              value={violations}
              onChange={(e) => setViolations(e.target.value)}
            />
          </div>
        ) : (
          <input type="hidden" name="maxFocusViolations" value={violations} />
        )}

        <ToggleRow
          id="requireFullscreen"
          name="requireFullscreen"
          checked={fullscreen}
          onChange={setFullscreen}
          label="Ask students to take the exam in fullscreen"
        />

        <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
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
          Browsers cannot block students from switching tabs. This detects and
          records it for review.
        </p>
      </fieldset>

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
      <div className="border-t border-white/10 pt-5">
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
              Save settings
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
      </div>
    </form>
  );
}

/* ============================================================
   ToggleRow — styled checkbox row
   ============================================================ */
function ToggleRow({
  id,
  name,
  checked,
  onChange,
  label,
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm transition-colors hover:border-white/20 hover:bg-white/[0.04]"
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-violet-500"
      />
      <span className="text-neutral-200">{label}</span>
    </label>
  );
}