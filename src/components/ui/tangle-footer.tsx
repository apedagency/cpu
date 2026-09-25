"use client";

// Tangle Footer by radiumcoders (21st.dev).
// CPU adaptation: the one-off fade-in used motion/react; it is now a CSS
// transition and reduced motion comes from matchMedia, so the footer adds no
// animation dependency. Ring geometry, copy tiling and the GPU rotation are
// unchanged. Uses the site face (Roboto Flex) and accepts children rendered
// inside the innermost arch.

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-media";
import { cn } from "@/lib/utils";

export type Ring = {
  d: string;
  circumference: number;
  cx: number;
  cy: number;
  strokeWidth: number;
  fontSize: number;
  text: string;
  duration: number;
  phase: number;
  reverse: boolean;
};

const RING_COUNT = 5;
const K = 0.5522847498;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function circlePath(cx: number, cy: number, r: number): string {
  const o = r * K;
  return [
    `M ${(cx + r).toFixed(1)} ${cy.toFixed(1)}`,
    `C ${(cx + r).toFixed(1)} ${(cy + o).toFixed(1)} ${(cx + o).toFixed(1)} ${(cy + r).toFixed(1)} ${cx.toFixed(1)} ${(cy + r).toFixed(1)}`,
    `C ${(cx - o).toFixed(1)} ${(cy + r).toFixed(1)} ${(cx - r).toFixed(1)} ${(cy + o).toFixed(1)} ${(cx - r).toFixed(1)} ${cy.toFixed(1)}`,
    `C ${(cx - r).toFixed(1)} ${(cy - o).toFixed(1)} ${(cx - o).toFixed(1)} ${(cy - r).toFixed(1)} ${cx.toFixed(1)} ${(cy - r).toFixed(1)}`,
    `C ${(cx + o).toFixed(1)} ${(cy - r).toFixed(1)} ${(cx + r).toFixed(1)} ${(cy - o).toFixed(1)} ${(cx + r).toFixed(1)} ${cy.toFixed(1)}`,
  ].join(" ");
}

/**
 * Whole repeats of the copy unit, sized a little under the circumference;
 * the <textPath> then stretches spacing to the exact length (textLength),
 * so the ring's end meets its start and the rotation has no visible seam.
 */
function buildRingCopy(line: string, other: string, mix: boolean, circumference: number, fontSize: number): string {
  const unit = mix ? `${line} · ${other} · ` : `${line} · ${line} · ${other} · `;
  const unitWidth = Math.max(unit.length * fontSize * 0.62, 1);
  const repeats = Math.max(1, Math.floor(circumference / unitWidth));
  return unit.repeat(repeats);
}

function buildRings(width: number, bandHeight: number, lines: string[], seed: number, stroke: number): Ring[] {
  const rand = mulberry32(seed);
  const cx = width / 2;
  const cy = bandHeight;
  const strokePad = stroke / 2 + 2;
  const outer = Math.max(Math.min(width / 2 - strokePad, bandHeight - strokePad), stroke * 4);
  const radii = Array.from({ length: RING_COUNT }, (_, i) => (outer * (i + 1)) / RING_COUNT);
  const fontSize = Math.min(22, Math.max(11, width * 0.02));

  return radii.map((r, i) => {
    const line = lines[Math.floor(rand() * lines.length)]!;
    const other = lines[Math.floor(rand() * lines.length)]!;
    const circumference = 2 * Math.PI * r;
    return {
      d: circlePath(cx, cy, r),
      circumference,
      cx,
      cy,
      strokeWidth: stroke,
      fontSize,
      text: buildRingCopy(line, other, rand() > 0.45, circumference, fontSize),
      duration: 42 + i * 8 + rand() * 10,
      phase: rand(),
      reverse: i % 2 === 1,
    };
  });
}

export type TangleFooterProps = {
  lines: string[];
  ribbon?: string;
  textColor?: string;
  background?: string;
  seed?: number;
  className?: string;
  /** Content centred in the innermost arch. */
  children?: ReactNode;
};

export function TangleFooter({
  lines,
  ribbon = "var(--cpu-mint)",
  textColor = "var(--cpu-ink-1)",
  background = "transparent",
  seed = 23,
  className,
  children,
}: TangleFooterProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = entry?.isIntersecting ?? true;
        setPaused(!on);
        if (on) setShown(true);
      },
      { rootMargin: "64px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stroke = width < 640 ? 18 : 28;
  const bandHeight = width > 0 ? width / 2 : 0;
  const rings = useMemo(
    () => (width > 0 && bandHeight > 0 ? buildRings(width, bandHeight, lines, seed, stroke) : []),
    [width, bandHeight, lines, seed, stroke],
  );
  // Free radius inside the innermost ribbon — the slot children sit in.
  const outer = Math.max(Math.min(width / 2 - (stroke / 2 + 2), bandHeight - (stroke / 2 + 2)), stroke * 4);
  const innerFree = Math.max(0, outer / RING_COUNT - stroke / 2 - 4);

  const spinName = `tangle-spin-${uid}`;

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full overflow-hidden", className)}
      style={{ background, aspectRatio: "2 / 1" }}
    >
      <style>{`@keyframes ${spinName}{to{transform:rotate(360deg)}}`}</style>

      {width > 0 && bandHeight > 0 ? (
        <svg
          className="absolute inset-0 size-full transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ opacity: shown || reduce ? 1 : 0, transform: shown || reduce ? "none" : "translateY(12px)" }}
          viewBox={`0 0 ${width} ${bandHeight}`}
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
        >
          <defs>
            {rings.map((ring, i) => (
              <path key={`def-${i}`} id={`${uid}-path-${i}`} d={ring.d} fill="none" />
            ))}
          </defs>
          {rings.map((ring, i) => {
            const pathId = `${uid}-path-${i}`;
            return (
              <g
                key={`ring-${i}`}
                style={
                  reduce
                    ? undefined
                    : {
                        transformBox: "view-box",
                        transformOrigin: `${ring.cx}px ${ring.cy}px`,
                        animation: `${spinName} ${ring.duration}s linear infinite`,
                        animationDirection: ring.reverse ? "reverse" : "normal",
                        animationDelay: `${-ring.phase * ring.duration}s`,
                        animationPlayState: paused ? "paused" : "running",
                        willChange: "transform",
                      }
                }
              >
                <use
                  href={`#${pathId}`}
                  strokeWidth={ring.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  style={{ stroke: ribbon }}
                />
                <text
                  fontSize={ring.fontSize}
                  fontWeight={700}
                  letterSpacing="0.05em"
                  dominantBaseline="central"
                  style={{ fill: textColor, userSelect: "none", pointerEvents: "none", fontFamily: "var(--font-sans)" }}
                >
                  <textPath href={`#${pathId}`} startOffset="0" method="align" textLength={ring.circumference - ring.fontSize * 0.4} lengthAdjust="spacing">
                    {ring.text}
                  </textPath>
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}

      {children && innerFree > 0 && (
        <div
          className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-end justify-center overflow-hidden"
          style={{ width: innerFree * 2, height: innerFree, borderRadius: `${innerFree}px ${innerFree}px 0 0` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default TangleFooter;
