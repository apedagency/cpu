"use client";

import { ArrowUpRight } from "lucide-react";
import { useRef, type ReactNode, type RefObject } from "react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { links, pool } from "@/lib/config";
import { amount, compact, UNAVAILABLE } from "@/lib/format";
import type { RewardSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

function Node({ refEl, label, value, tone = "muted", className }: { refEl: RefObject<HTMLDivElement | null>; label: string; value: ReactNode; tone?: "muted" | "lit"; className?: string }) {
  return (
    <div ref={refEl} className={cn("relative z-10 w-fit", className)}>
      <p className={cn("text-[0.6875rem] font-semibold uppercase tracking-[0.14em]", tone === "lit" ? "text-mint" : "text-paper/40")}>{label}</p>
      <p className={cn("tabular mt-1 text-lg font-semibold leading-tight", tone === "lit" ? "text-paper" : "text-paper/60")}>{value}</p>
    </div>
  );
}

/**
 * Level 3 — mechanics. One trade's fee, drawn as a flow: the pool fee splits
 * three ways, and the holders' share (the only path that lights up) is paid
 * in the payout asset to wallets over the minimum. Numbers are the token's
 * fixed terms, read live.
 */
export function FeeFlow({ rewards, loading }: { rewards: RewardSnapshot | null; loading: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const trade = useRef<HTMLDivElement>(null);
  const fee = useRef<HTMLDivElement>(null);
  const venue = useRef<HTMLDivElement>(null);
  const pad = useRef<HTMLDivElement>(null);
  const holders = useRef<HTMLDivElement>(null);
  const wallets = useRef<HTMLDivElement>(null);

  const terms = rewards?.terms ?? null;
  const chain = rewards?.chain ?? null;
  const sym = rewards?.payout.symbol ?? "wNVDAx";
  const venueShare = terms ? terms.venueCut : null;
  const holderShare = terms ? (1 - terms.venueCut) * (terms.holderShareBps / 10_000) : null;
  const padShare = venueShare !== null && holderShare !== null ? 1 - venueShare - holderShare : null;
  const p = (v: number | null) => (v === null ? UNAVAILABLE : `${(v * 100).toFixed(1)}%`);
  const width = (v: number | null) => (v === null ? 1.5 : 1 + v * 6);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3">
        <h3 className="text-xl font-semibold tracking-[-0.02em] text-paper">Where every trade&apos;s fee goes</h3>
        <p className="text-sm text-paper/50">
          {terms ? (
            <>
              <span className="tabular font-semibold text-teal">{amount(terms.holderFractionOfTrade * 100, 2)}%</span> of each trade reaches holders · fixed at launch
            </>
          ) : loading ? (
            "Reading fee terms…"
          ) : (
            "Fee terms unavailable"
          )}
        </p>
      </div>

      <div
        ref={box}
        className="relative grid grid-cols-1 justify-items-center gap-y-14 text-center md:grid-cols-[auto_auto_auto_auto] md:items-center md:justify-between md:justify-items-start md:gap-x-10 md:text-left"
      >
        <Node refEl={trade} label="Every trade" value="100%" />
        <Node refEl={fee} label="Pool fee" value={terms ? `${amount(terms.poolFeeBps / 100)}%` : UNAVAILABLE} />
        <div className="grid grid-cols-3 gap-x-6 md:grid-cols-1 md:gap-y-7">
          <Node refEl={venue} label={pool.venue} value={p(venueShare)} />
          <Node refEl={pad} label={pool.launchpad} value={p(padShare)} />
          <Node refEl={holders} label="CPU holders" value={p(holderShare)} tone="lit" />
        </div>
        <Node
          refEl={wallets}
          label={`Paid in ${sym}`}
          tone="lit"
          value={<span className="text-base">{chain ? `Wallets ≥ ${compact(chain.minEligible)} CPU` : "Eligible wallets"}</span>}
        />

        <AnimatedBeam containerRef={box} fromRef={trade} toRef={fee} pathWidth={2} pathOpacity={0.3} active={false} />
        <AnimatedBeam containerRef={box} fromRef={fee} toRef={venue} pathWidth={width(venueShare)} pathColor="#d7e0eb" pathOpacity={0.16} active={false} />
        <AnimatedBeam containerRef={box} fromRef={fee} toRef={pad} pathWidth={width(padShare)} pathColor="#3fcf9c" pathOpacity={0.3} active={false} />
        <AnimatedBeam containerRef={box} fromRef={fee} toRef={holders} pathWidth={width(holderShare)} pathOpacity={0.22} duration={3.4} />
        <AnimatedBeam containerRef={box} fromRef={holders} toRef={wallets} pathWidth={width(holderShare)} pathOpacity={0.22} duration={3.4} delay={0.9} />
      </div>

      <dl className="grid grid-cols-2 gap-x-10 gap-y-5 text-sm sm:grid-cols-4">
        {[
          { k: "Minimum to qualify", v: chain ? `${amount(chain.minEligible, 0)} CPU` : UNAVAILABLE },
          { k: "Counted supply", v: chain ? `${compact(chain.eligibleSupply)} CPU` : UNAVAILABLE },
          { k: "Burned", v: rewards?.supply.burned != null ? `${compact(rewards.supply.burned)} CPU` : UNAVAILABLE },
          { k: "Release window", v: chain ? `${Math.round(chain.stream.periodSeconds / 60)} min` : UNAVAILABLE },
        ].map((f) => (
          <div key={f.k}>
            <dt className="text-paper/40">{f.k}</dt>
            <dd className="tabular mt-1 text-paper/80">{f.v}</dd>
          </div>
        ))}
      </dl>

      <p className="max-w-3xl text-xs leading-relaxed text-paper/40">
        Every CPU trade pays the pool fee. {pool.venue} keeps its cut; of what {pool.launchpad} collects, the launcher share is streamed to
        wallets holding at least the minimum, in proportion to balance, and can be claimed at any time. Read live from the CPU contract on
        HyperEVM and{" "}
        <a href={links.signalDocs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-paper/60 underline-offset-4 hover:text-mint hover:underline">
          Signal
          <ArrowUpRight className="size-3" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        . Nothing here is a projection.
      </p>
    </div>
  );
}
