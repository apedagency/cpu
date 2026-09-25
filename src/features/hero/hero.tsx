"use client";

import { getImageProps } from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { NvidiaWordmark } from "@/components/brand/marks";
import { ContractCopy } from "@/components/contract-copy";
import { useFinePointer, useReducedMotion } from "@/hooks/use-media";
import { links, network, pool, site } from "@/lib/config";
import { pct, price } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMarket } from "@/features/data/market-context";

function LivePrice() {
  const { status, data, stale } = useMarket();
  const change = data?.change.h24 ?? null;
  return (
    <div className="flex items-baseline gap-3" aria-live="polite">
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
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const figureRef = useRef<HTMLDivElement>(null);

  const commonHeroProps = {
    alt: "CPU standing in a monumental black compute chamber beneath a curved mint halftone structure",
    sizes: "100vw",
    quality: 82,
  } as const;
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    ...commonHeroProps,
    src: "/art/campaign/01-hero-master.webp",
    width: 1672,
    height: 941,
  });
  const {
    props: { srcSet: mobileSrcSet, ...heroImageProps },
  } = getImageProps({
    ...commonHeroProps,
    src: "/art/campaign/02-hero-close-portrait.webp",
    width: 1122,
    height: 1402,
  });

  // A slight lean toward the pointer on desktop only.
  useEffect(() => {
    const el = figureRef.current;
    if (!el || !fine || reduced) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.transform = `translate3d(${x * 10}px, ${y * 6}px, 0) rotateY(${x * 3}deg)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [fine, reduced]);

  return (
    <section
      id="top"
      tabIndex={-1}
      aria-labelledby="hero-title"
      className="relative isolate h-svh min-h-[40rem] overflow-hidden"
    >
      <div ref={figureRef} className="pointer-events-none absolute -inset-[2%] -z-30 will-change-transform">
        <picture>
          <source media="(min-width: 769px)" srcSet={desktopSrcSet} />
          <source media="(max-width: 768px)" srcSet={mobileSrcSet} />
          <img
            {...heroImageProps}
            fetchPriority="high"
            className="size-full object-cover object-[58%_50%] max-md:object-[52%_42%]"
          />
        </picture>
      </div>

      {/* Contrast veil and floor handoff keep copy legible without flattening the CG. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(1,8,7,0.82)_0%,rgba(1,8,7,0.36)_36%,transparent_66%),linear-gradient(180deg,rgba(1,8,7,0.32)_0%,transparent_45%)] max-md:bg-[linear-gradient(180deg,rgba(1,8,7,0.72)_0%,transparent_42%,rgba(1,8,7,0.78)_78%,#010807_100%)]"
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[34svh] bg-linear-to-b from-transparent via-cpu-black/70 to-cpu-black" />

      {/* The word, set wide and heavy, as a stencil across the halftone. */}
      <p
        aria-hidden="true"
        className="type-display pointer-events-none absolute inset-x-0 top-[21svh] -z-10 select-none text-center text-[clamp(8rem,35vw,34rem)] text-transparent opacity-30 max-md:hidden"
        style={{ WebkitTextStroke: "1px rgb(151 252 228 / 0.22)", textShadow: "0 0 90px rgba(2,12,10,0.9)" }}
      >
        CPU
      </p>

      <span data-hero-visor-target className="absolute left-[67%] top-[28%] h-[16%] w-[16%] max-md:left-[30%] max-md:top-[18%] max-md:h-[22%] max-md:w-[40%]" aria-hidden="true" />

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
