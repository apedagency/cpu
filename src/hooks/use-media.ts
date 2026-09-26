"use client";

import { useSyncExternalStore } from "react";

/** One subscribe function per query: a new one each render would make React re-subscribe every render. */
const subscribers = new Map<string, (cb: () => void) => () => void>();

function subscribeTo(query: string) {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    subscribe = (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    };
    subscribers.set(query, subscribe);
  }
  return subscribe;
}

/** SSR-safe media query; returns `fallback` on the server and first paint. */
export function useMedia(query: string, fallback = false) {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
/** Fine pointer with hover — cursor-driven effects are limited to these devices. */
export const useFinePointer = () => useMedia("(hover: hover) and (pointer: fine)");
