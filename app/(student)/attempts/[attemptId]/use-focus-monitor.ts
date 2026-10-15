"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Monitoring = {
  policy: "OFF" | "LOG_ONLY" | "WARN_THEN_FLAG" | "AUTO_SUBMIT";
  limit: number;
  requireFullscreen: boolean;
  initialViolations: number;
};

export type FocusWarning = { count: number; limit: number; action: "WARN" | "FLAG" };

export function useFocusMonitor(options: {
  attemptId: string;
  monitoring: Monitoring;
  onEnded: () => void;
}) {
  const { attemptId, monitoring } = options;
  const active = monitoring.policy !== "OFF";
  const showsWarnings = monitoring.policy === "WARN_THEN_FLAG" || monitoring.policy === "AUTO_SUBMIT";

  const away = useRef(false);
  const onEndedRef = useRef(options.onEnded);
  useEffect(() => {
    onEndedRef.current = options.onEnded;
  });

  const [warning, setWarning] = useState<FocusWarning | null>(null);
  const [needsFullscreen, setNeedsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);

  const send = useCallback(
    async (type: "FOCUS_LOST" | "FOCUS_RETURNED" | "FULLSCREEN_EXITED", keepalive = false) => {
      try {
        const response = await fetch(`/api/attempts/${attemptId}/events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type }),
          keepalive,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.ended) {
          onEndedRef.current();
          return;
        }
        if (data.counted && showsWarnings && (data.action === "WARN" || data.action === "FLAG")) {
          setWarning({ count: data.violations, limit: data.limit, action: data.action });
        }
      } catch {
        // Best effort. The server also notices long gaps through the heartbeat.
      }
    },
    [attemptId, showsWarnings]
  );

  // Leaving and returning to the page.
  useEffect(() => {
    if (!active) return;

    const lost = () => {
      if (away.current) return;
      away.current = true;
      void send("FOCUS_LOST", true);
    };
    const returned = () => {
      if (!away.current) return;
      away.current = false;
      void send("FOCUS_RETURNED");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") lost();
      else returned();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", lost);
    window.addEventListener("focus", returned);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", lost);
      window.removeEventListener("focus", returned);
    };
  }, [active, send]);

  // Fullscreen: asked for when the exam requires it, and exits are reported.
  useEffect(() => {
    if (!monitoring.requireFullscreen) return;
    const supported = typeof document.documentElement.requestFullscreen === "function";
    setFullscreenSupported(supported);
    if (!supported) return;

    setNeedsFullscreen(!document.fullscreenElement);
    const onChange = () => {
      if (document.fullscreenElement) {
        setNeedsFullscreen(false);
        return;
      }
      setNeedsFullscreen(true);
      if (active) void send("FULLSCREEN_EXITED");
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [monitoring.requireFullscreen, active, send]);

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  return {
    monitored: active,
    warning,
    dismissWarning: () => setWarning(null),
    needsFullscreen: monitoring.requireFullscreen && fullscreenSupported && needsFullscreen,
    enterFullscreen,
  };
}