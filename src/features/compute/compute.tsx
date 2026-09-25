"use client";

import { ArrowUpRight } from "lucide-react";
import { useMarket } from "@/features/data/market-context";
import { useLive } from "@/hooks/use-live";
import { links, refresh, token } from "@/lib/config";
import type { RewardSnapshot } from "@/lib/types";
import { HolderLookup } from "./holder-lookup";
import { PositionCalculator } from "./position-calculator";
import { RewardLedger } from "./reward-ledger";

export function Compute() {
  const rewards = useLive<RewardSnapshot>("/api/rewards", refresh.rewards);
  const market = useMarket();

  return (
    <section
      id="compute"
      tabIndex={-1}
      aria-labelledby="compute-title"
      className="relative overflow-hidden bg-cpu-black px-(--gutter) py-[clamp(5rem,10vw,9rem)] outline-none"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-0 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(0,240,230,0.10)_0%,transparent_65%)]"
      />
      <header className="relative mb-14 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="type-label mb-4 text-mint">Compute</p>
          <h2
            id="compute-title"
            className="max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-paper [font-variation-settings:'wdth'_110,'opsz'_120]"
          >
            What the fee flow has paid, and what it owes.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Read live from the {token.symbol} contract on HyperEVM and{" "}
          <a href={links.signalDocs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-mint underline-offset-4 hover:underline">
            Signal
            <ArrowUpRight className="size-3" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          . Paid, pending and historical figures are kept apart; nothing is projected.
        </p>
      </header>

      <div className="relative">
        <RewardLedger live={rewards} />
      </div>

      <div className="relative mt-20 grid gap-16 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <div>
          <h3 className="mb-8 text-2xl font-semibold tracking-[-0.02em] text-paper">Position</h3>
          <PositionCalculator market={market.data} rewards={rewards.data} />
        </div>
        <div className="lg:border-l lg:border-mint/10 lg:pl-20">
          <h3 className="mb-8 text-2xl font-semibold tracking-[-0.02em] text-paper">Wallet</h3>
          <HolderLookup rewards={rewards.data} />
        </div>
      </div>
    </section>
  );
}
