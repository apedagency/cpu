"use client";

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef } from "react";
import { ShaderBackground, type HalftoneRecipe } from "@/components/ui/halftone-dots-led-screen";
import { useFinePointer, useReducedMotion } from "@/hooks/use-media";

gsap.registerPlugin(ScrollTrigger);

const WORLD_RECIPE: HalftoneRecipe = {
  colors: ["#020c0a", "#020c0a", "#031a15", "#0d5a44", "#3fcf9c", "#97fce4"],
  scale: 1.72,
  intensity: 0.84,
  paramA: 0.78,
  warp: 0.55,
  detail: 1.1,
  contrast: 1.12,
  brightness: -0.01,
  saturation: 1.05,
  vignette: 0.3,
  grain: 0.014,
  seed: 3,
  rotate: 0.52,
  drift: 0.07,
  timeScale: 0.38,
  cursorEffect: 3,
  cursorStrength: 0.72,
  cursorRadius: 0.34,
};

type EnvironmentState = {
  shader: number;
  glowX: string;
  glowY: string;
  glow: number;
  glass: number;
  lines: number;
  shade: number;
};

const STATES: Record<string, EnvironmentState> = {
  top: { shader: 1, glowX: "52%", glowY: "42%", glow: 0.82, glass: 0.08, lines: 0.05, shade: 0.22 },
  lore: { shader: 0.5, glowX: "76%", glowY: "30%", glow: 0.34, glass: 0.04, lines: 0.02, shade: 0.5 },
  // Utility sections sit on calm ground: little shader, almost no lines.
  compute: { shader: 0.12, glowX: "20%", glowY: "22%", glow: 0.2, glass: 0.02, lines: 0.03, shade: 0.78 },
  engine: { shader: 0.32, glowX: "58%", glowY: "46%", glow: 0.48, glass: 0.64, lines: 0.08, shade: 0.44 },
  gallery: { shader: 0.46, glowX: "38%", glowY: "48%", glow: 0.42, glass: 0.18, lines: 0.04, shade: 0.42 },
  market: { shader: 0.1, glowX: "28%", glowY: "18%", glow: 0.18, glass: 0.02, lines: 0.03, shade: 0.8 },
  footer: { shader: 0.38, glowX: "50%", glowY: "88%", glow: 0.34, glass: 0.12, lines: 0.04, shade: 0.54 },
};

function stateVars(state: EnvironmentState) {
  return {
    "--env-shader-opacity": state.shader,
    "--env-glow-x": state.glowX,
    "--env-glow-y": state.glowY,
    "--env-glow-opacity": state.glow,
    "--env-glass-opacity": state.glass,
    "--env-lines-opacity": state.lines,
    "--env-shade-opacity": state.shade,
  } as gsap.TweenVars;
}

export function SiteEnvironment() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const order = ["top", "lore", "compute", "engine", "gallery", "market", "footer"];
    gsap.set(root, stateVars(STATES.top));
    if (reduced) return;

    const context = gsap.context(() => {
      order.forEach((id, index) => {
        const section = document.getElementById(id);
        if (!section) return;
        const previous = STATES[order[Math.max(0, index - 1)]];
        ScrollTrigger.create({
          trigger: section,
          start: "top 62%",
          end: "bottom 38%",
          onEnter: () => gsap.to(root, { ...stateVars(STATES[id]), duration: 1.35, ease: "power2.out", overwrite: "auto" }),
          onEnterBack: () => gsap.to(root, { ...stateVars(STATES[id]), duration: 1.15, ease: "power2.out", overwrite: "auto" }),
          onLeaveBack: () => gsap.to(root, { ...stateVars(previous), duration: 1.15, ease: "power2.out", overwrite: "auto" }),
        });
      });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, root);

    return () => context.revert();
  }, [reduced]);

  return (
    <div ref={rootRef} className="site-environment" aria-hidden="true">
      <div className="site-environment__shader">
        <ShaderBackground recipe={WORLD_RECIPE} cursor={fine} still={reduced} />
      </div>
      <div className="site-environment__aurora" />
      <div className="site-environment__glass" />
      <div className="site-environment__lines" />
      <div className="site-environment__shade" />
      <div className="site-environment__grain" />
    </div>
  );
}
