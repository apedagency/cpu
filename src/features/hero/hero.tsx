"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { NvidiaWordmark } from "@/components/brand/marks";
import { ContractCopy } from "@/components/contract-copy";
import { ShaderBackground, type HalftoneRecipe } from "@/components/ui/halftone-dots-led-screen";
import { useFinePointer, useReducedMotion } from "@/hooks/use-media";
import { links, network, pool, site } from "@/lib/config";
import { pct, price } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMarket } from "@/features/data/market-context";

/** Halftone recipe tuned to x-banner: green-black field, mint dot waves. */
const CPU_HALFTONE: HalftoneRecipe = {
  // Low noise falls to the field colour, so dots only light up inside the
  // wave bands — the banner's black gaps between luminous halftone shapes.
  colors: ["#020c0a", "#020c0a", "#031a15", "#0d5a44", "#3fcf9c", "#97fce4"],
  scale: 1.7,
  intensity: 0.86,
  paramA: 0.78,
  warp: 0.55,
  detail: 1.1,
  contrast: 1.12,
  brightness: -0.01,
  saturation: 1.05,
  vignette: 0.32,
  grain: 0.016,
  seed: 3,
  rotate: 0.52,
  drift: 0.08,
  timeScale: 0.42,
  cursorEffect: 3,
  cursorStrength: 0.8,
  cursorRadius: 0.32,
};

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
      className="relative isolate h-svh min-h-[40rem] overflow-hidden bg-cpu-black outline-none"
    >
      <div className="absolute inset-0 -z-10">
        <ShaderBackground recipe={CPU_HALFTONE} cursor={fine} still={reduced} />
      </div>
      {/* Tonal pools: a dark stage behind the cat, and a floor fade into the page. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(38%_48%_at_50%_58%,rgba(2,12,10,0.94)_0%,rgba(2,12,10,0.6)_50%,transparent_100%)]"
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[34svh] bg-linear-to-b from-transparent via-cpu-black/70 to-cpu-black" />

      {/* The word, set wide and heavy, as a stencil across the halftone. */}
      <p
        aria-hidden="true"
        className="type-display pointer-events-none absolute inset-x-0 top-[21svh] -z-10 select-none text-center text-[clamp(8rem,35vw,34rem)] text-ink-1/95 max-md:top-[30svh]"
        style={{ WebkitTextStroke: "1px rgb(151 252 228 / 0.16)", textShadow: "0 0 90px rgba(2,12,10,0.9)" }}
      >
        CPU
      </p>

      {/* Character + reflective floor, echoing the banner stage. */}
      <div
        className="pointer-events-none absolute bottom-[9svh] left-1/2 h-[min(76svh,58rem,75vw)] -translate-x-1/2 max-md:bottom-[calc(15rem+2svh)] max-md:h-[calc(100svh-15rem-15.5rem)] max-md:max-h-108"
        style={{ aspectRatio: "1431 / 1800", perspective: "1200px" }}
      >
        <div ref={figureRef} className="relative h-full w-full will-change-transform">
          <Image
            src="/art/character/hero.webp"
            alt="CPU, the Hyperliquid cat, standing in a black-and-white tactical exosuit with a teal-lit Hyperliquid visor"
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 768px) 80vw, 46vw"
            className="object-contain object-bottom drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-full h-[22%] overflow-hidden opacity-25"
            style={{ maskImage: "linear-gradient(to bottom, black, transparent 80%)" }}
          >
            <div className="relative h-[455%] w-full -scale-y-100">
              <Image src="/art/character/hero.webp" alt="" fill sizes="(max-width: 768px) 80vw, 46vw" className="object-contain object-bottom" />
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute -bottom-3 left-1/2 h-6 w-[70%] -translate-x-1/2 rounded-[50%] bg-teal/25 blur-2xl" />
      </div>

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
