"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Envelope } from "@/lib/types";

export type LiveStatus = "loading" | "ready" | "error";

export interface Live<T> {
  status: LiveStatus;
  data: T | null;
  /** Server assembly time of the payload currently shown. */
  fetchedAt: number | null;
  /** True when a refresh failed and the shown data is from an earlier poll. */
  stale: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Polls one of our API routes. Pauses while the tab is hidden, refreshes on
 * return, and keeps the last good payload (flagged stale) if a poll fails —
 * so the UI never swaps real numbers for placeholders.
 */
export function useLive<T>(url: string | null, intervalMs: number): Live<T> {
  const [state, setState] = useState<Omit<Live<T>, "refresh">>({
    status: "loading",
    data: null,
    fetchedAt: null,
    stale: false,
    error: null,
  });
  const inflight = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!url) return;
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      // A proxy or platform error page is HTML, not our envelope.
      const body = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as Envelope<T> | { error: string };
      if (!res.ok || "error" in body) {
        throw new Error("error" in body ? body.error : `HTTP ${res.status}`);
      }
      setState({ status: "ready", data: body.data, fetchedAt: body.fetchedAt, stale: false, error: null });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      const message = err instanceof Error ? err.message : "request failed";
      setState((prev) =>
        prev.data
          ? { ...prev, stale: true, error: message }
          : { status: "error", data: null, fetchedAt: null, stale: false, error: message },
      );
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const first = setTimeout(() => void load(), 0);

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(() => void load(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        void load();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(first);
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      inflight.current?.abort();
    };
  }, [url, intervalMs, load]);

  return { ...state, refresh: () => void load() };
}
