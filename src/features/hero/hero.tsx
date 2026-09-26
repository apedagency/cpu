"use client";

import { ArrowUpRight } from "lucide-react";
import { NvidiaWordmark } from "@/components/brand/marks";
import { ContractCopy } from "@/components/contract-copy";
import { links, network, pool, site } from "@/lib/config";
import { pct, price } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMarket } from "@/features/data/market-context";
import { HeroScene } from "./hero-scene";

function LivePrice() {
  const { status, data, stale } = useMarket();
  const change = data?.change.h24 ?? null;
  return (
    <div className="flex items-baseline gap-3">
      {status === "loading" ? (
        <span className="skeleton inline-block h-7 w-28 rounded" aria-label="Loading price" />
      ) : status === "error" ? (
        <span className="text-sm text-muted-foreground">Price unavailable right now</span>
      ) : (
        <>
          <span className="tabular text-2xl font-semibold text-paper md:text-3xl">{price(data?.priceUsd)}</span>
          <span
            className={cn(
              "tabular text-sm font-medium",
              change === null ? "text-muted-foreground" : change >= 0 ? "text-teal" : "text-fog",
            )}
          >
            {pct(change)} <span className="text-muted-foreground">24h</span>
          </span>
          {stale && <span className="type-label">delayed</span>}
        </>
      )}
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      tabIndex={-1}
      aria-labelledby="hero-title"
      className="relative isolate h-svh min-h-[40rem] overflow-hidden"
    >
      <HeroScene />

      {/* Title block */}
      <div className="absolute left-(--gutter) top-[clamp(5.25rem,15svh,9rem)] max-w-88 max-md:right-(--gutter) max-md:max-w-none">
        <p className="type-label mb-4 text-mint max-md:mb-2">
          {network.name} · {pool.launchpad}
        </p>
        <h1
          id="hero-title"
          className="text-[clamp(2rem,4.4vw,4rem)] font-semibold leading-[0.92] tracking-[-0.035em] text-paper [font-variation-settings:'wdth'_104,'opsz'_120]"
        >
          Cat Purrcessing
          <br className="max-md:hidden" /> Unit
        </h1>
        <p className="mt-4 text-base text-paper/70 max-md:mt-2 max-md:text-sm">{site.tagline}</p>
      </div>

      {/* Bottom rail: ticker + live price / pairing + actions */}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 px-(--gutter) pb-[clamp(1.25rem,4svh,2.5rem)] max-md:bg-linear-to-t max-md:from-cpu-black max-md:via-cpu-black/90 max-md:to-transparent max-md:pt-10">
        <div className="flex flex-col gap-2 max-md:gap-1">
          <span className="type-display text-[clamp(2.25rem,5vw,4.5rem)] text-paper">
            <span className="text-mint">$</span>
            {site.ticker}
          </span>
          <LivePrice />
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <p className="flex items-center gap-3 text-sm text-paper/75">
            <span className="type-label text-paper/60">Paired with</span>
            <NvidiaWordmark height={18} />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ContractCopy className="sm:hidden" />
            <a
              href={links.dexscreener}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-11 items-center gap-2 rounded-md bg-teal px-4 text-sm font-semibold text-ink-1 transition-[background-color,box-shadow] hover:bg-mint hover:shadow-[0_0_32px_-6px_var(--cpu-teal)]"
            >
              View on Dexscreener
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
