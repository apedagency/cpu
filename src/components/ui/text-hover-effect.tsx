"use client";

// Text Hover Effect from mdafsarx's Hover Footer (21st.dev).
// CPU adaptation: motion is replaced by GSAP (stroke draw-in when the
// wordmark scrolls into view; the reveal mask eases after the cursor via
// quickTo). The rainbow stroke becomes the CPU light — mint → teal → white.
// The viewBox is measured from the real glyph bounds so the wordmark spans
// its container edge to edge in the site's display face. Without a fine
// pointer the light sweeps slowly by itself; reduced motion leaves it lit.

import gsap from "gsap";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useFinePointer, useReducedMotion } from "@/hooks/use-media";
import { cn } from "@/lib/utils";

export function TextHoverEffect({ text, className }: { text: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const svgRef = useRef<SVGSVGElement>(null);
  const measureRef = useRef<SVGTextElement>(null);
  const drawRef = useRef<SVGTextElement>(null);
  const maskRef = useRef<SVGRadialGradientElement>(null);
  const [box, setBox] = useState("0 0 300 100");

  // Fit the viewBox to the glyphs once the display face has loaded.
  useLayoutEffect(() => {
    let alive = true;
    const fit = () => {
      const b = measureRef.current?.getBBox();
      if (alive && b && b.width) setBox(`${b.x - 2} ${b.y + b.height * 0.1} ${b.width + 4} ${b.height * 0.8}`);
    };
    fit();
    document.fonts?.ready.then(fit);
    return () => {
      alive = false;
    };
  }, [text]);

  // Draw the outline in when it enters the viewport.
  useEffect(() => {
    const svg = svgRef.current;
    const draw = drawRef.current;
    if (!svg || !draw) return;
    if (reduced) {
      gsap.set(draw, { strokeDashoffset: 0 });
      return;
    }
    gsap.set(draw, { strokeDasharray: 1400, strokeDashoffset: 1400 });
    let tween: gsap.core.Tween | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        tween = gsap.to(draw, { strokeDashoffset: 0, duration: 3.2, ease: "power2.inOut" });
      },
      { threshold: 0.3 },
    );
    io.observe(svg);
    return () => {
      io.disconnect();
      tween?.kill();
    };
  }, [reduced]);

  // The light: follows the cursor on fine pointers, sweeps on its own
  // otherwise. Driven in SVG user units through a proxy (quickTo is numeric).
  useEffect(() => {
    const svg = svgRef.current;
    const mask = maskRef.current;
    if (!svg || !mask) return;
    const [bx, by, bw, bh] = box.split(" ").map(Number);
    const light = { x: bx + bw / 2, y: by + bh / 2 };
    const apply = () => {
      mask.setAttribute("cx", String(light.x));
      mask.setAttribute("cy", String(light.y));
    };
    mask.setAttribute("r", String(bw * (reduced ? 0.8 : 0.22)));
    apply();
    if (reduced) return;
    if (!fine) {
      const sweep = gsap.fromTo(light, { x: bx }, { x: bx + bw, duration: 6, ease: "sine.inOut", repeat: -1, yoyo: true, paused: true, onUpdate: apply });
      const io = new IntersectionObserver(([e]) => (e?.isIntersecting ? sweep.play() : sweep.pause()));
      io.observe(svg);
      return () => {
        io.disconnect();
        sweep.kill();
      };
    }
    const toX = gsap.quickTo(light, "x", { duration: 0.35, ease: "power3.out", onUpdate: apply });
    const toY = gsap.quickTo(light, "y", { duration: 0.35, ease: "power3.out", onUpdate: apply });
    const onMove = (e: PointerEvent) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      toX(p.x);
      toY(p.y);
    };
    svg.addEventListener("pointermove", onMove);
    return () => svg.removeEventListener("pointermove", onMove);
  }, [fine, reduced, box]);

  const textProps = {
    x: 0,
    y: 0,
    dominantBaseline: "alphabetic" as const,
    style: { fontFamily: "var(--font-sans)", fontWeight: 900, fontVariationSettings: "'wdth' 151, 'opsz' 144", fontSize: 100, letterSpacing: "-0.02em" },
  };

  return (
    <svg ref={svgRef} viewBox={box} className={cn("block w-full select-none", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-light`} gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#97fce4" />
          <stop offset="50%" stopColor="#00f0e6" />
          <stop offset="100%" stopColor="#fbf9fb" />
        </linearGradient>
        <radialGradient ref={maskRef} id={`${uid}-reveal`} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id={`${uid}-mask`}>
          <rect x="-50%" y="-50%" width="200%" height="200%" fill={`url(#${uid}-reveal)`} />
        </mask>
      </defs>
      {/* Ghost outline, always there. */}
      <text ref={measureRef} {...textProps} fill="transparent" stroke="rgb(151 252 228 / 0.14)" strokeWidth={0.6}>
        {text}
      </text>
      {/* Drawn-in teal outline. */}
      <text ref={drawRef} {...textProps} fill="transparent" stroke="rgb(0 240 230 / 0.45)" strokeWidth={0.6}>
        {text}
      </text>
      {/* The light under the cursor. */}
      <g mask={`url(#${uid}-mask)`}>
        <text {...textProps} fill="rgb(0 240 230 / 0.12)" stroke={`url(#${uid}-light)`} strokeWidth={1}>
          {text}
        </text>
      </g>
    </svg>
  );
}

export default TextHoverEffect;
