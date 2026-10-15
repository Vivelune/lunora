"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnswerState = {
  selectedOptionIds: string[];
  textAnswer: string;
  flagged: boolean;
};

export type ServerAnswer = AnswerState & { revision: number };
export type SaveStatus = "saved" | "saving" | "error";

type Entry = {
  revision: number;
  latest: AnswerState | null;
  dirty: boolean;
  inFlight: boolean;
  failures: number;
  rejected: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

const BACKOFF_CAP_MS = 15_000;

export function useAnswerSaver(options: {
  attemptId: string;
  initialRevisions: Record<string, number>;
  onConflict: (questionId: string, current: ServerAnswer) => void;
  onEnded: () => void;
}) {
  const { attemptId } = options;

  const entries = useRef(new Map<string, Entry>());
  const initialRevisions = useRef(options.initialRevisions);
  const callbacks = useRef({ onConflict: options.onConflict, onEnded: options.onEnded });
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    callbacks.current = { onConflict: options.onConflict, onEnded: options.onEnded };
  });

  const getEntry = useCallback((questionId: string): Entry => {
    let entry = entries.current.get(questionId);
    if (!entry) {
      entry = {
        revision: initialRevisions.current[questionId] ?? 0,
        latest: null,
        dirty: false,
        inFlight: false,
        failures: 0,
        rejected: false,
        timer: null,
      };
      entries.current.set(questionId, entry);
    }
    return entry;
  }, []);

  const runRef = useRef<(questionId: string) => Promise<void>>(async () => {});

  const run = useCallback(
    async (questionId: string) => {
      const entry = getEntry(questionId);
      if (entry.inFlight || !entry.dirty || !entry.latest || entry.rejected) return;

      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }

      const payload = entry.latest;
      entry.inFlight = true;
      entry.dirty = false;
      bump();

      let retry = false;
      try {
        const response = await fetch(`/api/attempts/${attemptId}/answers`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ questionId, ...payload, baseRevision: entry.revision }),
        });

        if (response.ok) {
          const data = await response.json();
          entry.revision = data.revision;
          entry.failures = 0;
        } else if (response.status === 409) {
          const data = await response.json().catch(() => ({}));
          if (data.ended) {
            callbacks.current.onEnded();
          } else if (data.current) {
            // Another tab saved first. The server's version wins.
            entry.revision = data.current.revision;
            entry.dirty = false;
            entry.latest = null;
            entry.failures = 0;
            callbacks.current.onConflict(questionId, data.current as ServerAnswer);
          }
        } else if (response.status >= 500 || response.status === 429) {
          retry = true;
        } else {
          // 400, 401, 403, 404: retrying the same request cannot help.
          entry.rejected = true;
        }
      } catch {
        retry = true;
      }

      entry.inFlight = false;

      if (retry) {
        entry.failures += 1;
        entry.dirty = true;
        const wait = Math.min(BACKOFF_CAP_MS, 1000 * 2 ** (entry.failures - 1));
        entry.timer = setTimeout(() => {
          entry.timer = null;
          void runRef.current(questionId);
        }, wait);
      } else if (entry.dirty && !entry.rejected) {
        // The student changed the answer while this save was in flight.
        void runRef.current(questionId);
      }
      bump();
    },
    [attemptId, bump, getEntry]
  );

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const schedule = useCallback(
    (questionId: string, answer: AnswerState, delayMs: number) => {
      const entry = getEntry(questionId);
      entry.latest = answer;
      entry.dirty = true;
      entry.rejected = false;
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      if (delayMs <= 0) {
        void runRef.current(questionId);
      } else {
        entry.timer = setTimeout(() => {
          entry.timer = null;
          void runRef.current(questionId);
        }, delayMs);
      }
      bump();
    },
    [bump, getEntry]
  );

  const flush = useCallback(
    (questionId: string) => {
      const entry = entries.current.get(questionId);
      if (!entry || !entry.dirty) return;
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      void runRef.current(questionId);
    },
    []
  );

  const flushAll = useCallback(() => {
    for (const questionId of entries.current.keys()) flush(questionId);
  }, [flush]);

  // Save pending answers when the connection returns or the tab is hidden.
  useEffect(() => {
    const onOnline = () => flushAll();
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [flushAll]);

  // Warn before leaving with answers that are not saved yet.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      for (const entry of entries.current.values()) {
        if (entry.dirty || entry.inFlight || entry.failures > 0 || entry.rejected) {
          event.preventDefault();
          event.returnValue = "";
          return;
        }
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Stop timers when the screen closes.
  useEffect(() => {
    const map = entries.current;
    return () => {
      for (const entry of map.values()) {
        if (entry.timer) clearTimeout(entry.timer);
      }
    };
  }, []);

  const statusOf = (questionId: string): SaveStatus => {
    const entry = entries.current.get(questionId);
    if (!entry) return "saved";
    if (entry.rejected || entry.failures > 0) return "error";
    if (entry.dirty || entry.inFlight) return "saving";
    return "saved";
  };

  let pending = 0;
  let failing = 0;
  for (const entry of entries.current.values()) {
    if (entry.rejected || entry.failures > 0) failing += 1;
    else if (entry.dirty || entry.inFlight) pending += 1;
  }

  return { schedule, flush, flushAll, statusOf, pending, failing };
}