"use client";

import Image from "next/image";
import { useRef } from "react";
import { useFinePointer, useReducedMotion } from "@/hooks/use-media";
import { useHeroParallax } from "./use-hero-parallax";

/** Also decoded by the loader (site-loader.tsx) before the intro settles. */
const HERO_CHARACTER_SRC = "/hero/hero-character-main.webp";

/**
 * Character-first hero art, back to front:
 * plate → title veil → CPU stencil → halo → far glass → reflection → floor
 * → CPU (+ visor glint) → near glass → foreground glass.
 * Assets are built by scripts/hero/build_hero_assets.py (see assets/hero/manifest.json).
 */
export function HeroScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  useHeroParallax(sceneRef, fine && !reduced);

  return (
    <div ref={sceneRef} className="hero-scene">
      <div className="hero-scene__plate-mask" aria-hidden="true">
        <div data-parallax="plate" className="hero-scene__plate">
          <Image
            src="/hero/hero-background-plate.webp"
            alt=""
            fill
            loading="eager"
            sizes="(max-width: 767px) 250vw, 140vw"
            className="object-cover"
          />
        </div>
      </div>
      <div className="hero-scene__veil" aria-hidden="true" />

      <p aria-hidden="true" data-parallax="stencil" className="type-display select-none hero-scene__stencil">
        CPU
      </p>

      <Image
        src="/hero/hero-backlight-halo.webp"
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        unoptimized
        loading="eager"
        data-parallax="halo"
        className="hero-scene__halo"
      />
      <Image
        src="/hero/hero-hl-object-1.webp"
        alt=""
        aria-hidden="true"
        width={560}
        height={430}
        unoptimized
        data-parallax="far"
        className="hero-scene__far h-auto"
      />

      <div data-parallax="ground" className="hero-scene__ground" aria-hidden="true">
        <Image src="/hero/hero-character-shadow.webp" alt="" width={1137} height={576} unoptimized className="hero-scene__fill" />
      </div>
      <div className="hero-scene__floor" aria-hidden="true" />

      <div data-parallax="figure" className="hero-scene__figure">
        <Image
          src={HERO_CHARACTER_SRC}
          alt="CPU, the Hyperliquid cat, in a black-and-white tactical exosuit with a glowing mint visor"
          width={1137}
          height={1600}
          unoptimized
          loading="eager"
          fetchPriority="high"
          draggable={false}
          className="hero-scene__fill"
        />
        <div className="hero-scene__visor" aria-hidden="true">
          <Image
            src="/hero/hero-visor-highlight.webp"
            alt=""
            width={731}
            height={231}
            unoptimized
            data-parallax="glint"
            className="hero-scene__glint"
          />
        </div>
        {/* The loader's glass shade lands here. */}
        <span data-hero-visor-target aria-hidden="true" className="absolute left-[44.94%] top-[13.06%] h-[14.44%] w-[40.19%]" />
      </div>

      <Image
        src="/hero/hero-hl-object-2.webp"
        alt=""
        aria-hidden="true"
        width={420}
        height={339}
        unoptimized
        data-parallax="near"
        className="hero-scene__near h-auto"
      />
      <Image
        src="/hero/hero-foreground-glass.webp"
        alt=""
        aria-hidden="true"
        width={1280}
        height={720}
        unoptimized
        loading="eager"
        data-parallax="glass"
        className="hero-scene__glass"
      />
      <div className="hero-scene__edge" aria-hidden="true" />
    </div>
  );
}
