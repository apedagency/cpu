// Built from "SVG Clip Mask" by educalvolpz on 21st.dev
// (21st.dev/@educalvolpz/components/svg-clip-mask): content seen through a
// custom SVG path clip.
// Adapted for CPU: the clip is inverted into a portal (the children are cut
// away inside the path, so whatever sits underneath shows through it), the
// path scales about an anchor instead of morphing, it is driven imperatively
// (GSAP in the site loader) instead of by motion/react, and a rim layer traces
// the same path.
"use client";

import { type ReactNode, type Ref, useImperativeHandle, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

/** Where the path sits at scale 1: the anchor's position in px, and px per path unit. */
export interface ClipFrame {
  x: number;
  y: number;
  kx: number;
  ky: number;
}

export interface SvgClipMaskHandle {
  /** Opens the portal to `scale` (1 = the frame's own size); clip and rim move together. */
  setScale: (scale: number) => void;
  /** Smallest scale at which the portal covers the whole container, or null when it can't run. */
  coverScale: () => number | null;
  /** The rim layer, so callers can fade it on their own timeline. */
  rim: () => SVGSVGElement | null;
}

export interface SvgClipMaskProps {
  children: ReactNode;
  /** Absolute M/L/C/Z path data, in its own units. */
  path: string;
  /** The point (in path units) the portal scales about. */
  anchor: [number, number];
  /** Maps the path onto the container at scale 1. */
  frame: (width: number, height: number) => ClipFrame;
  /** Drawn in path units along the portal edge; strokes should be non-scaling. */
  rim?: ReactNode;
  className?: string;
  ref?: Ref<SvgClipMaskHandle>;
}

const PROBE = 'path(evenodd, "M0 0H1V1Z")';
const EDGE_SAMPLES = 16;

export default function SvgClipMask({ children, path, anchor, frame, rim, className, ref }: SvgClipMaskProps) {
  const clipRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const tokens = useMemo(() => path.match(/[MLCZ]|-?\d*\.?\d+/gi) ?? [], [path]);

  useImperativeHandle(
    ref,
    () => {
      const [ax, ay] = anchor;
      const size = () => ({ w: clipRef.current?.clientWidth ?? 0, h: clipRef.current?.clientHeight ?? 0 });

      return {
        setScale(scale) {
          const el = clipRef.current;
          if (!el) return;
          const { w, h } = size();
          const { x, y, kx, ky } = frame(w, h);
          const sx = kx * scale;
          const sy = ky * scale;
          let d = `M0 0H${w}V${h}H0Z`;
          let pair: number | null = null;
          for (const t of tokens) {
            if (/[a-z]/i.test(t)) {
              d += t;
            } else if (pair === null) {
              pair = x + sx * (Number(t) - ax);
            } else {
              d += `${pair.toFixed(1)} ${(y + sy * (Number(t) - ay)).toFixed(1)} `;
              pair = null;
            }
          }
          el.style.clipPath = `path(evenodd, "${d}")`;
          groupRef.current?.setAttribute("transform", `matrix(${sx} 0 0 ${sy} ${x - sx * ax} ${y - sy * ay})`);
          if (rimRef.current) rimRef.current.style.visibility = "visible";
        },

        coverScale() {
          if (typeof CSS === "undefined" || !CSS.supports("clip-path", PROBE) || typeof Path2D === "undefined") return null;
          const ctx = document.createElement("canvas").getContext("2d");
          const { w, h } = size();
          if (!ctx || !w || !h) return null;
          const shape = new Path2D(path);
          const { x, y, kx, ky } = frame(w, h);
          const edge: [number, number][] = [];
          for (let i = 0; i <= EDGE_SAMPLES; i++) {
            const f = i / EDGE_SAMPLES;
            edge.push([f * w, 0], [f * w, h], [0, f * h], [w, f * h]);
          }
          const covers = (s: number) =>
            edge.every(([px, py]) => ctx.isPointInPath(shape, ax + (px - x) / (kx * s), ay + (py - y) / (ky * s)));

          let lo = 1;
          let hi = 2;
          while (!covers(hi)) {
            lo = hi;
            hi *= 2;
            if (hi > 4096) return null;
          }
          for (let i = 0; i < 20; i++) {
            const mid = (lo + hi) / 2;
            if (covers(mid)) hi = mid;
            else lo = mid;
          }
          return hi;
        },

        rim: () => rimRef.current,
      };
    },
    [anchor, frame, path, tokens],
  );

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div ref={clipRef} className="size-full">
        {children}
      </div>
      {rim && (
        <svg ref={rimRef} aria-hidden="true" className="pointer-events-none invisible absolute inset-0 size-full overflow-visible">
          <g ref={groupRef}>{rim}</g>
        </svg>
      )}
    </div>
  );
}
