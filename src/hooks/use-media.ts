"use client";

import { useSyncExternalStore } from "react";

function subscribeTo(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
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
