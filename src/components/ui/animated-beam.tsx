"use client";

// Animated Beam by dillionverma / Magic UI (21st.dev).
// CPU adaptation: the travelling gradient (framer-motion on x1/x2) is a GSAP
// attribute tween, so the site keeps one animation runtime; the curve runs
// edge-to-edge between the anchors and bends horizontally or vertically
// depending on where the target sits, so one flow works on desktop (row) and
// mobile (column). Stroke width can encode a quantity. Reduced motion draws
// the gradient still.

import gsap from "gsap";
import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "@/hooks/use-media";
import { cn } from "@/lib/utils";

interface AnimatedBeamProps {
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  className?: string;
  pathColor?: string;
  pathOpacity?: number;
  pathWidth?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  duration?: number;
  delay?: number;
  /** false: draw the resting path only (no travelling light). */
  active?: boolean;
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  className,
  pathColor = "rgb(151 252 228)",
  pathOpacity = 0.14,
  pathWidth = 2,
  gradientStartColor = "#97fce4",
  gradientStopColor = "#00f0e6",
  duration = 3.2,
  delay = 0,
  active = true,
}: AnimatedBeamProps) {
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const gradRef = useRef<SVGLinearGradientElement>(null);
  const [geo, setGeo] = useState({ d: "", w: 0, h: 0, vertical: false });

  // useEffect, not layout: the container is this beam's parent, and a
  // parent's ref is attached only after its children's layout effects run.
  useEffect(() => {
    const update = () => {
      const c = containerRef.current;
      const a = fromRef.current;
      const b = toRef.current;
      if (!c || !a || !b) return;
      const cr = c.getBoundingClientRect();
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const vertical = br.top - ar.bottom > br.left - ar.right;
      let d: string;
      if (vertical) {
        const x1 = ar.left + ar.width / 2 - cr.left;
        const y1 = ar.bottom - cr.top;
        const x2 = br.left + br.width / 2 - cr.left;
        const y2 = br.top - cr.top;
        const my = (y1 + y2) / 2;
        d = `M ${x1},${y1} C ${x1},${my} ${x2},${my} ${x2},${y2}`;
      } else {
        const x1 = ar.right - cr.left;
        const y1 = ar.top + ar.height / 2 - cr.top;
        const x2 = br.left - cr.left;
        const y2 = br.top + br.height / 2 - cr.top;
        const mx = (x1 + x2) / 2;
        d = `M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      }
      setGeo({ d, w: cr.width, h: cr.height, vertical });
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, fromRef, toRef]);

  useLayoutEffect(() => {
    const g = gradRef.current;
    if (!g || !geo.d || !active) return;
    const [a1, a2] = geo.vertical ? ["y1", "y2"] : ["x1", "x2"];
    const [o1, o2] = geo.vertical ? ["x1", "x2"] : ["y1", "y2"];
    gsap.set(g, { attr: { [o1]: "0%", [o2]: "0%" } });
    if (reduced) {
      gsap.set(g, { attr: { [a1]: "0%", [a2]: "100%" } });
      return;
    }
    const tween = gsap.fromTo(
      g,
      { attr: { [a1]: "10%", [a2]: "0%" } },
      { attr: { [a1]: "110%", [a2]: "100%" }, duration, delay, ease: "expo.out", repeat: -1 },
    );
    return () => {
      tween.kill();
    };
  }, [geo.d, geo.vertical, active, reduced, duration, delay]);

  return (
    <svg
      aria-hidden="true"
      fill="none"
      width={geo.w}
      height={geo.h}
      viewBox={`0 0 ${geo.w || 1} ${geo.h || 1}`}
      className={cn("pointer-events-none absolute left-0 top-0", className)}
    >
      <path d={geo.d} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={pathOpacity} strokeLinecap="round" />
      {active && (
        <>
          <path d={geo.d} stroke={`url(#${id})`} strokeWidth={pathWidth} strokeLinecap="round" />
          <defs>
            <linearGradient ref={gradRef} id={id} gradientUnits="userSpaceOnUse" x1="0%" x2="0%" y1="0%" y2="0%">
              <stop stopColor={gradientStartColor} stopOpacity="0" />
              <stop stopColor={gradientStartColor} />
              <stop offset="32.5%" stopColor={gradientStopColor} />
              <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        </>
      )}
    </svg>
  );
}

export default AnimatedBeam;
