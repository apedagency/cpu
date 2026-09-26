"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { useMarket } from "@/features/data/market-context";
import { useReducedMotion } from "@/hooks/use-media";
import { useLive } from "@/hooks/use-live";
import { refresh } from "@/lib/config";
import type { RewardSnapshot } from "@/lib/types";
import { FeeFlow } from "./fee-flow";
import { HolderLookup } from "./holder-lookup";
import { Machine } from "./machine";
import { PositionCalculator } from "./position-calculator";

const MODES = [
  { id: "amount", label: "By amount" },
  { id: "wallet", label: "By wallet" },
];

/**
 * Three levels, read top to bottom: the machine (what the fee flow has
 * credited, paid and is streaming), your CPU (one tool, two modes), and the
 * mechanics (one flow + the fixed terms).
 */
export function Compute() {
  const rewards = useLive<RewardSnapshot>("/api/rewards", refresh.rewards);
  const market = useMarket();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState("amount");
  const panelRef = useRef<HTMLDivElement>(null);

  // Mode change: the incoming tool slides in from the side it was chosen on.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el || reduced) return;
    const tween = gsap.fromTo(el, { opacity: 0, x: mode === "wallet" ? 18 : -18 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" });
    return () => {
      tween.kill();
    };
  }, [mode, reduced]);

  return (
    <section id="compute" tabIndex={-1} aria-labelledby="compute-title" className="relative px-(--gutter) pb-[clamp(5rem,9vw,8rem)] pt-[clamp(6rem,11vw,10rem)]">
      <h2 id="compute-title" className="mb-8 flex items-center gap-3 text-sm font-medium text-paper/70">
        <span className="h-px w-8 bg-teal" aria-hidden="true" />
        Compute · holder rewards, live from HyperEVM
      </h2>

      <Machine live={rewards} />

      <div className="relative mt-[clamp(5rem,9vw,8rem)] rounded-md bg-ink-1/55 p-[clamp(1.25rem,3.5vw,3rem)] shadow-[inset_0_1px_0_rgba(151,252,228,0.07),0_40px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-md">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <h3 className="mb-3 text-sm text-paper/55">Your CPU</h3>
            <AnimatedTabs
              tabs={MODES}
              active={mode}
              onChange={setMode}
              label="Check your CPU"
              idBase="your-cpu"
              tabClassName="text-[clamp(1.5rem,3vw,2.25rem)] font-semibold tracking-[-0.03em]"
            />
          </div>
          <p className="max-w-xs text-sm text-paper/45">
            {mode === "amount" ? "Try any amount against today's price and eligible supply." : "Read any wallet straight from the contract."}
          </p>
        </div>
        <div ref={panelRef} role="tabpanel" id={`your-cpu-panel-${mode}`} aria-labelledby={`your-cpu-tab-${mode}`}>
          {mode === "amount" ? <PositionCalculator market={market.data} rewards={rewards.data} /> : <HolderLookup rewards={rewards.data} />}
        </div>
      </div>

      <div className="mt-[clamp(5rem,9vw,8rem)]">
        <FeeFlow rewards={rewards.data} loading={rewards.status === "loading"} />
      </div>
    </section>
  );
}
