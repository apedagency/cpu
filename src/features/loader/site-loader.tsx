"use client";

import gsap from "gsap";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import DotTransition from "@/components/ui/dot-transition";
import { HYPERLIQUID_PATH, HYPERLIQUID_VIEWBOX } from "@/components/brand/marks";
import { site } from "@/lib/config";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { INTRO_KEY } from "./intro-gate";

const MAX_WAIT_MS = 6000;
/** Emergency exit only: the intro settles by MAX_WAIT_MS plus the last hold. */
const SAFETY_TIMEOUT_MS = 7500;
/** The root's CSS opacity fade (duration-500) plus a frame. */
const FADE_MS = 550;
/** The handoff runs ~0.9s; past this the loader unmounts regardless. */
const HANDOFF_MAX_MS = 1600;

type Exit = "fade" | "handoff";

const noopSubscribe = () => () => {};
/** Set before first paint by INTRO_GATE_SCRIPT (repeat visit or reduced motion). */
const readSeen = () => document.documentElement.dataset.intro === "seen";

/** Assets the hero needs before the intro may settle. */
const criticalImages = () => [
  // Same URL the hero paints (served as-is), so this decode warms the real image.
  "/hero/hero-character-main.webp",
  "/loader/cpu-glass-shade.svg",
];

const markDataUri = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${HYPERLIQUID_VIEWBOX}"><path fill="#fff" d="${HYPERLIQUID_PATH}"/></svg>`,
)}`;

/**
 * First-visit intro: the dot grid assembles the Hyperliquid mark, then the
 * CPU glass shade, and lifts once fonts and the hero art are actually ready.
 * Hidden before paint for repeat visits in the session (see IntroGate),
 * for reduced motion, and without JS.
 *
 * run → leaving → done. The page is released (scroll unlocked, loader
 * click-through) the moment it starts leaving; the exit animation is pure
 * decoration and every path out of it ends in unmounting.
 */
export function SiteLoader() {
  const seen = useSyncExternalStore(noopSubscribe, readSeen, () => false);
  const [phase, setPhase] = useState<"run" | "leaving" | "done">("run");
  const [exit, setExit] = useState<Exit>("fade");
  const [ready, setReady] = useState(false);
  const images = useMemo(() => [markDataUri, "/loader/cpu-glass-shade.svg"], []);
  const finishedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);

  /** The only way out of the intro. Idempotent: later calls are no-ops. */
  const finishLoader = useCallback((mode: Exit) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    unlockScroll("loader");
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* private mode */
    }
    setExit(mode);
    setPhase("leaving");
  }, []);

  const skip = useCallback(() => finishLoader("fade"), [finishLoader]);
  const handoff = useCallback(() => finishLoader("handoff"), [finishLoader]);

  // Leaving: glass → hero visor when it can be measured and animated,
  // otherwise the plain fade. Either way a timer guarantees unmounting.
  useLayoutEffect(() => {
    if (phase !== "leaving") return;
    const done = () => setPhase("done");
    const root = rootRef.current;
    let timer = window.setTimeout(done, exit === "handoff" ? HANDOFF_MAX_MS : FADE_MS);
    let context: gsap.Context | undefined;

    const fadeOut = () => {
      if (root) root.style.opacity = "0";
      window.clearTimeout(timer);
      timer = window.setTimeout(done, FADE_MS);
    };

    if (exit === "handoff") {
      const dots = dotsRef.current;
      const glass = glassRef.current;
      const target = document.querySelector<HTMLElement>("[data-hero-visor-target]");
      const from = glass?.getBoundingClientRect();
      const to = target?.getBoundingClientRect();
      if (!root || !dots || !glass || !from?.width || !from.height || !to?.width || !to.height) {
        fadeOut();
      } else {
        try {
          context = gsap.context(() => {
            gsap.set(glass, { opacity: 0, transformOrigin: "top left" });
            gsap
              .timeline({ onComplete: done })
              .to(glass, { opacity: 0.92, duration: 0.16, ease: "power1.out" })
              .to(dots, { opacity: 0, duration: 0.32, ease: "power2.out" }, 0)
              .to(root, { backgroundColor: "rgba(11,15,18,0)", duration: 0.5, ease: "power2.out" }, 0.12)
              .to(
                glass,
                {
                  x: to.left - from.left,
                  y: to.top - from.top,
                  scaleX: to.width / from.width,
                  scaleY: to.height / from.height,
                  duration: 0.78,
                  ease: "power3.inOut",
                },
                0.08,
              )
              .to(glass, { opacity: 0, duration: 0.28, ease: "power2.out" }, 0.62);
          });
        } catch {
          fadeOut();
        }
      }
    }

    return () => {
      window.clearTimeout(timer);
      context?.revert();
    };
  }, [phase, exit]);

  // Running: hold the scroll lock, wait for assets, listen for skips.
  useEffect(() => {
    // `seen` is the server snapshot (false) during hydration, so also read
    // the gate directly: repeat visits must never take the lock at all.
    if (seen || readSeen() || finishedRef.current) return;
    lockScroll("loader");

    let cancelled = false;
    const decode = criticalImages().map((src) => {
      const img = new window.Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    });
    Promise.all([document.fonts?.ready, ...decode]).then(() => {
      if (!cancelled) setReady(true);
    });
    const cap = window.setTimeout(() => !cancelled && setReady(true), MAX_WAIT_MS);
    // If the dot sequence never reports (asset, canvas or timing failure).
    const safety = window.setTimeout(skip, SAFETY_TIMEOUT_MS);

    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("wheel", skip, { once: true, passive: true });
    window.addEventListener("touchstart", skip, { once: true, passive: true });

    return () => {
      cancelled = true;
      window.clearTimeout(cap);
      window.clearTimeout(safety);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
      unlockScroll("loader");
    };
  }, [seen, skip]);

  if (seen || phase === "done") return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "site-loader fixed inset-0 z-100 bg-cpu-black transition-opacity duration-500 ease-out",
        phase !== "run" && "pointer-events-none",
      )}
      style={{ opacity: phase === "leaving" && exit === "fade" ? 0 : 1 }}
      onClick={skip}
      role="presentation"
    >
      <p className="sr-only" role="status">
        Loading {site.name}
      </p>
      <div ref={dotsRef} className="absolute inset-0">
        <DotTransition
          images={images}
          once
          ready={ready}
          onComplete={handoff}
          className="h-full w-full"
          spacing={13}
          dotSize={1.6}
          maxDotSize={9}
          growDuration={1.05}
          holdDuration={0.3}
          shrinkDuration={0.75}
          gapDuration={0.08}
          fill={0.62}
          dotColor="#97fce4"
          backgroundColor="#0b0f12"
        />
      </div>
      <div
        ref={glassRef}
        className="pointer-events-none fixed left-1/2 top-1/2 aspect-[1200/520] w-[min(62vw,42rem)] -translate-x-1/2 -translate-y-1/2 opacity-0"
      >
        <Image src="/loader/cpu-glass-shade.svg" alt="" fill preload sizes="(max-width: 768px) 62vw, 42rem" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-(--gutter) text-paper/70">
        <span className="type-label text-paper/60">{site.name}</span>
        <span className="type-label text-mint/80">${site.ticker}</span>
      </div>
    </div>
  );
}
