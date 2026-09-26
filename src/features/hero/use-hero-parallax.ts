"use client";

import { useEffect, type RefObject } from "react";

/**
 * Per-layer response to the pointer, in px (or % of the layer for `unit: "%"`)
 * at the edge of the hero. Layers behind the character drift with the pointer,
 * layers in front drift against it, so the character reads as the focal plane.
 */
const DEPTH: Record<string, { x: number; y: number; rx?: number; ry?: number; unit?: "%"; fast?: boolean; glow?: number }> = {
  plate: { x: 12, y: 6 },
  stencil: { x: 8, y: 4 },
  halo: { x: 16, y: 10, glow: 0.28 },
  far: { x: 10, y: 7 },
  ground: { x: 7, y: 3 },
  figure: { x: 7, y: 3, rx: 1.3, ry: 2.2 },
  glint: { x: 10, y: 4, unit: "%", fast: true },
  near: { x: -16, y: -10 },
  glass: { x: -22, y: -12 },
};

// Exponential smoothing time constants (ms): calm for the scene, quicker for the visor glint.
const TAU_SLOW = 170;
const TAU_FAST = 95;

/**
 * Cursor micro-interaction for the hero scene. Writes transforms (and the halo's
 * opacity) directly on `[data-parallax]` elements from one rAF loop that sleeps
 * when settled. Callers only enable it for fine pointers without reduced motion.
 */
export function useHeroParallax(sceneRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const scene = sceneRef.current;
    const section = scene?.closest("section");
    if (!scene || !section || !enabled) return;

    const layers = Array.from(scene.querySelectorAll<HTMLElement>("[data-parallax]")).flatMap((el) => {
      const depth = DEPTH[el.dataset.parallax ?? ""];
      return depth ? [{ el, depth, opacity: parseFloat(getComputedStyle(el).opacity) || 1 }] : [];
    });
    scene.dataset.live = "";

    const target = { x: 0, y: 0 };
    const slow = { x: 0, y: 0 };
    const fast = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;
    let visible = true;

    // How close the pointer is to the head (upper centre), relative to rest.
    const closeness = (x: number, y: number) => 1 - Math.min(1, Math.hypot(x - 0.05, y + 0.45) / 1.2);
    const rest = closeness(0, 0);

    const render = () => {
      const glow = closeness(slow.x, slow.y) - rest;
      for (const { el, depth, opacity } of layers) {
        const p = depth.fast ? fast : slow;
        const u = depth.unit ?? "px";
        let t = `translate3d(${(p.x * depth.x).toFixed(2)}${u}, ${(p.y * depth.y).toFixed(2)}${u}, 0)`;
        if (depth.rx || depth.ry) {
          t = `perspective(1400px) ${t} rotateX(${(-p.y * (depth.rx ?? 0)).toFixed(3)}deg) rotateY(${(p.x * (depth.ry ?? 0)).toFixed(3)}deg)`;
        }
        el.style.transform = t;
        if (depth.glow) el.style.opacity = Math.min(1, opacity + depth.glow * glow).toFixed(3);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(64, last ? now - last : 16);
      last = now;
      const ks = 1 - Math.exp(-dt / TAU_SLOW);
      const kf = 1 - Math.exp(-dt / TAU_FAST);
      slow.x += (target.x - slow.x) * ks;
      slow.y += (target.y - slow.y) * ks;
      fast.x += (target.x - fast.x) * kf;
      fast.y += (target.y - fast.y) * kf;
      const settled = Math.abs(target.x - slow.x) + Math.abs(target.y - slow.y) < 0.0015;
      if (settled) {
        Object.assign(slow, target);
        Object.assign(fast, target);
      }
      render();
      raf = settled ? 0 : requestAnimationFrame(tick);
      if (settled) last = 0;
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (!visible || e.pointerType === "touch") return;
      const r = section.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      wake();
    };
    const recenter = () => {
      target.x = 0;
      target.y = 0;
      wake();
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) recenter();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) recenter();
    });
    io.observe(section);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("blur", recenter);

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", recenter);
      cancelAnimationFrame(raf);
      delete scene.dataset.live;
      for (const { el } of layers) {
        el.style.transform = "";
        el.style.opacity = "";
      }
    };
  }, [sceneRef, enabled]);
}
