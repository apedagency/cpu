"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import DotTransition from "@/components/ui/dot-transition";
import { HYPERLIQUID_PATH, HYPERLIQUID_VIEWBOX } from "@/components/brand/marks";
import { site } from "@/lib/config";
import { INTRO_KEY } from "./intro-gate";

const MAX_WAIT_MS = 6000;

const noopSubscribe = () => () => {};
/** Set before first paint by INTRO_GATE_SCRIPT (repeat visit or reduced motion). */
const readSeen = () => document.documentElement.dataset.intro === "seen";

/** Assets the hero needs before the intro may settle. */
const CRITICAL_IMAGES = ["/art/character/hero.webp"];

const markDataUri = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${HYPERLIQUID_VIEWBOX}"><path fill="#fff" d="${HYPERLIQUID_PATH}"/></svg>`,
)}`;

/**
 * First-visit intro: the dot grid assembles the Hyperliquid mark, then the
 * CPU silhouette, and lifts once fonts and the hero art are actually ready.
 * Hidden before paint for repeat visits in the session (see IntroGate),
 * for reduced motion, and without JS.
 */
export function SiteLoader() {
  const seen = useSyncExternalStore(noopSubscribe, readSeen, () => false);
  const [phase, setPhase] = useState<"run" | "leaving" | "done">("run");
  const [ready, setReady] = useState(false);
  const images = useMemo(() => [markDataUri, "/brand/cpu-silhouette.png"], []);

  const finish = useCallback(() => {
    setPhase((p) => (p === "run" ? "leaving" : p));
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (seen) return;
    document.documentElement.style.overflow = "hidden";

    let cancelled = false;
    const decode = CRITICAL_IMAGES.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    });
    Promise.all([document.fonts?.ready, ...decode]).then(() => {
      if (!cancelled) setReady(true);
    });
    const cap = window.setTimeout(() => !cancelled && setReady(true), MAX_WAIT_MS);

    const skip = () => finish();
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("wheel", skip, { once: true, passive: true });
    window.addEventListener("touchstart", skip, { once: true, passive: true });

    return () => {
      cancelled = true;
      window.clearTimeout(cap);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    };
  }, [seen, finish]);

  useEffect(() => {
    if (seen || phase === "run") return;
    document.documentElement.style.overflow = "";
    if (phase === "leaving") {
      const t = window.setTimeout(() => setPhase("done"), 750);
      return () => window.clearTimeout(t);
    }
  }, [seen, phase]);

  if (seen || phase === "done") return null;

  return (
    <div
      className="site-loader fixed inset-0 z-100 bg-cpu-black transition-opacity duration-700 ease-out"
      style={{ opacity: phase === "leaving" ? 0 : 1 }}
      onClick={finish}
      role="presentation"
    >
      <p className="sr-only" role="status">
        Loading {site.name}
      </p>
      <DotTransition
        images={images}
        once
        ready={ready}
        onComplete={finish}
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-(--gutter) text-paper/70">
        <span className="type-label text-paper/60">{site.name}</span>
        <span className="type-label text-mint/80">${site.ticker}</span>
      </div>
    </div>
  );
}
