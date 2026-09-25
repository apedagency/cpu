// Built using Hyperiux Vault: https://vault.hyperiux.com
// Adapted for CPU: play-once sequence mode (`once` + `onComplete`), a `ready`
// gate so the final shape only settles once the page's assets are decoded,
// and a sizing className instead of a fixed h-screen section.
"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 * Inlined from ./createSuspendedRaf — owns a requestAnimationFrame loop
 * that auto-pauses when the tab is hidden or the canvas is offscreen.
 * ------------------------------------------------------------------ */

const DEFAULT_ROOT_MARGIN = "256px";

type RafRoot = Element | null | { current: Element | null } | (() => Element | null);

function resolveElement(root: RafRoot): Element | null {
  if (!root) return null;
  if (typeof root === "function") return root() ?? null;
  if (typeof root === "object" && "current" in root) return root.current ?? null;
  return root;
}

interface VisibilityGateOptions {
  root?: RafRoot;
  rootMargin?: string;
  threshold?: number;
  observeTab?: boolean;
  observeOffscreen?: boolean;
  onChange?: (active: boolean) => void;
}

interface VisibilityGate {
  readonly isActive: boolean;
  observe: (nextRoot?: RafRoot) => void;
  destroy: () => void;
}

function createVisibilityGate({
  root = null,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0,
  observeTab = true,
  observeOffscreen = true,
  onChange,
}: VisibilityGateOptions = {}): VisibilityGate {
  let tabVisible = typeof document === "undefined" ? true : !document.hidden;
  let onscreen = true;
  let destroyed = false;
  let observer: IntersectionObserver | null = null;

  const isActive = () => {
    if (destroyed) return false;
    if (observeTab && !tabVisible) return false;
    if (observeOffscreen && resolveElement(root) && !onscreen) return false;
    return true;
  };

  let lastActive = isActive();

  const emit = () => {
    if (destroyed) return;
    const next = isActive();
    if (next === lastActive) return;
    lastActive = next;
    onChange?.(next);
  };

  const onVisibilityChange = () => {
    tabVisible = !document.hidden;
    emit();
  };

  if (observeTab && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  const bindObserver = () => {
    if (!observeOffscreen || typeof IntersectionObserver === "undefined") return;
    const el = resolveElement(root);
    if (!el) return;
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onscreen = entry.isIntersecting;
        emit();
      },
      { rootMargin, threshold },
    );
    observer.observe(el);
  };

  bindObserver();

  return {
    get isActive() {
      return isActive();
    },
    observe(nextRoot?: RafRoot) {
      if (destroyed) return;
      if (nextRoot != null) root = nextRoot;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      onscreen = true;
      bindObserver();
      emit();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (observeTab && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };
}

interface SuspendedRafOptions {
  onFrame: (time: number) => void;
  root?: RafRoot;
  rootMargin?: string;
  threshold?: number;
  observeTab?: boolean;
  observeOffscreen?: boolean;
}

interface SuspendedRaf {
  start: () => void;
  stop: () => void;
  readonly isRunning: boolean;
  readonly isActive: boolean;
  observe: (nextRoot?: RafRoot) => void;
  destroy: () => void;
}

function createSuspendedRaf({
  onFrame,
  root = null,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0,
  observeTab = true,
  observeOffscreen = true,
}: SuspendedRafOptions): SuspendedRaf {
  let rafId: number | null = null;
  let running = false;
  let destroyed = false;

  const stopRaf = () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = (time: number) => {
    rafId = null;
    if (destroyed || !running || !gate.isActive) return;
    onFrame(time);
    if (!destroyed && running && gate.isActive) rafId = requestAnimationFrame(tick);
  };

  const sync = () => {
    if (destroyed) return;
    if (running && gate.isActive) {
      if (rafId == null) rafId = requestAnimationFrame(tick);
    } else {
      stopRaf();
    }
  };

  const gate = createVisibilityGate({ root, rootMargin, threshold, observeTab, observeOffscreen, onChange: sync });

  return {
    start() {
      if (destroyed) return;
      running = true;
      sync();
    },
    stop() {
      running = false;
      stopRaf();
    },
    get isRunning() {
      return running;
    },
    get isActive() {
      return gate.isActive;
    },
    observe(nextRoot?: RafRoot) {
      gate.observe(nextRoot);
      sync();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      stopRaf();
      gate.destroy();
    },
  };
}

/* ------------------------------------------------------------------ */

const REDUCED_MOTION_FADE_DURATION = 0.7;
const REDUCED_MOTION_HOLD_DURATION = 1.6;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, v: number): number => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const smootherstep = (e0: number, e1: number, v: number): number => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const hexToRgbTriplet = (hex: string): string => {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
};

type Phase = "grow" | "hold" | "shrink" | "gap";

export interface DotTransitionProps {
  /** Images to cycle through. White/light silhouettes on transparent work best. */
  images: string[];
  spacing?: number;
  dotSize?: number;
  maxDotSize?: number;
  growDuration?: number;
  holdDuration?: number;
  shrinkDuration?: number;
  gapDuration?: number;
  revealAnchor?: number;
  dotColor?: string;
  backgroundColor?: string;
  /** Run the sequence once and stop on the last shape instead of looping. */
  once?: boolean;
  /** In `once` mode, the last shape keeps holding until this is true. */
  ready?: boolean;
  onComplete?: () => void;
  /** Fraction of the shorter side the silhouette may occupy (1 = full). */
  fill?: number;
  className?: string;
}

/**
 * A canvas 2D dot grid that grows into a silhouette mask sampled from an
 * image, holds, then shrinks away before cycling to the next one. Respects
 * `prefers-reduced-motion` with a plain crossfade in place of the wipe.
 */
export default function DotTransition({
  images,
  spacing = 26,
  dotSize = 2.4,
  maxDotSize = 10,
  growDuration = 1.8,
  holdDuration = 0.05,
  shrinkDuration = 1.8,
  gapDuration = 0.2,
  revealAnchor = 0.5,
  dotColor = "#ffffff",
  backgroundColor = "#000000",
  once = false,
  ready = true,
  onComplete,
  fill = 1,
  className = "",
}: DotTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readyRef = useRef(ready);
  const completeRef = useRef(onComplete);
  useLayoutEffect(() => {
    readyRef.current = ready;
    completeRef.current = onComplete;
  }, [ready, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cols = 0;
    let rows = 0;
    let cellW = spacing;
    let cellH = spacing;
    let masks: Float32Array[] = [];
    let loadedCount = 0;
    let completed = false;

    let reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const reduceMotionMq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const handleReduceMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
    };

    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    const dotColorRgb = hexToRgbTriplet(dotColor);
    const imageEls = images.map(() => new window.Image());

    const buildMasks = () => {
      if (!cols || !rows || loadedCount < images.length) return;
      offscreen.width = cols;
      offscreen.height = rows;
      masks = imageEls.map((img) => {
        offCtx.clearRect(0, 0, cols, rows);
        if (img.naturalWidth && img.naturalHeight) {
          const scale = Math.min(cols / img.naturalWidth, rows / img.naturalHeight) * fill;
          const w = img.naturalWidth * scale;
          const h = img.naturalHeight * scale;
          offCtx.drawImage(img, (cols - w) / 2, (rows - h) / 2, w, h);
        }
        const data = offCtx.getImageData(0, 0, cols, rows).data;
        const mask = new Float32Array(cols * rows);
        for (let i = 0; i < cols * rows; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          const a = data[i * 4 + 3];
          mask[i] = ((r + g + b) / (3 * 255)) * (a / 255);
        }
        return mask;
      });
    };

    images.forEach((src, i) => {
      const img = imageEls[i];
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loadedCount++;
        buildMasks();
      };
      img.onerror = () => {
        loadedCount++;
        buildMasks();
      };
      img.src = src;
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.round(width / spacing));
      rows = Math.max(1, Math.round(height / spacing));
      cellW = width / cols;
      cellH = height / rows;
      buildMasks();
    };

    const state: { imageIndex: number; phase: Phase; phaseStart: number; shrinkStartProgress: number } = {
      imageIndex: 0,
      phase: "grow",
      phaseStart: 0,
      shrinkStartProgress: 1,
    };
    let liveProgress = 0;

    const durationFor = (phase: Phase): number => {
      if (phase === "grow") return growDuration;
      if (phase === "hold") return holdDuration;
      if (phase === "shrink") return shrinkDuration;
      return gapDuration;
    };

    const nextPhase = (phase: Phase): Phase => {
      if (phase === "grow") return "hold";
      if (phase === "hold") return "shrink";
      if (phase === "shrink") return "gap";
      return "grow";
    };

    const isLastShape = () => state.imageIndex === images.length - 1;

    const handleClick = () => {
      if (reduceMotion || once) return;
      if (state.phase === "grow" || state.phase === "hold") {
        state.shrinkStartProgress = liveProgress;
        state.phase = "shrink";
        state.phaseStart = 0;
      } else if (state.phase === "gap") {
        state.phase = "grow";
        state.phaseStart = 0;
        state.imageIndex = (state.imageIndex + 1) % images.length;
      }
    };

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: (ms) => {
        const time = ms * 0.001;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        if (!cols || !rows || masks.length < images.length) return;

        let progress: number;
        if (state.phaseStart === 0) state.phaseStart = time;
        const elapsed = time - state.phaseStart;
        const duration = reduceMotion
          ? state.phase === "grow" || state.phase === "shrink"
            ? REDUCED_MOTION_FADE_DURATION
            : state.phase === "hold"
              ? REDUCED_MOTION_HOLD_DURATION
              : durationFor(state.phase)
          : durationFor(state.phase);
        const t = duration > 0 ? clamp01(elapsed / duration) : 1;
        const eased = smootherstep(0, 1, t);

        if (state.phase === "grow") progress = eased;
        else if (state.phase === "hold") progress = 1;
        else if (state.phase === "shrink") progress = lerp(state.shrinkStartProgress, 0, eased);
        else progress = 0;

        // Once mode: the final shape holds until the page is ready, then reports.
        const parkOnLast = once && isLastShape() && state.phase === "hold";
        if (parkOnLast && elapsed >= duration && readyRef.current && !completed) {
          completed = true;
          completeRef.current?.();
        }

        if (elapsed >= duration && !parkOnLast) {
          state.phaseStart = time;
          const wasGap = state.phase === "gap";
          state.phase = nextPhase(state.phase);
          if (wasGap) state.imageIndex = (state.imageIndex + 1) % images.length;
          if (state.phase === "shrink") state.shrinkStartProgress = 1;
        }

        liveProgress = progress;
        const mask = masks[state.imageIndex];
        if (!mask) return;

        const anchorPx = height * revealAnchor;
        const edgePx = Math.max(cellH * 2.6, 1);
        const maxExtentPx = Math.max(anchorPx, height - anchorPx) + cellH + edgePx;
        const bandRadius = progress * (maxExtentPx + edgePx) - edgePx;

        for (let ry = 0; ry < rows; ry++) {
          const cy = cellH * (ry + 0.5);
          const band = reduceMotion
            ? progress
            : 1 - smoothstep(bandRadius - edgePx, bandRadius + edgePx, Math.abs(cy - anchorPx));
          for (let rx = 0; rx < cols; rx++) {
            const active = mask[ry * cols + rx] * band;
            const size = lerp(dotSize, maxDotSize, active);
            const alpha = lerp(0.16, 1, active);
            const cx = cellW * (rx + 0.5);
            ctx.fillStyle = `rgba(${dotColorRgb}, ${alpha})`;
            ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
          }
        }
      },
    });

    resize();
    window.addEventListener("resize", resize);
    reduceMotionMq?.addEventListener?.("change", handleReduceMotionChange);
    canvas.addEventListener("click", handleClick);
    loop.start();

    return () => {
      window.removeEventListener("resize", resize);
      reduceMotionMq?.removeEventListener?.("change", handleReduceMotionChange);
      canvas.removeEventListener("click", handleClick);
      imageEls.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
      loop.destroy();
    };
  }, [images, spacing, dotSize, maxDotSize, growDuration, holdDuration, shrinkDuration, gapDuration, revealAnchor, dotColor, backgroundColor, once, fill]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor }}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
