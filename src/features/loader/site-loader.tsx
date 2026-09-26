"use client";

import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import DotTransition from "@/components/ui/dot-transition";
import SvgClipMask, { type ClipFrame, type SvgClipMaskHandle } from "@/components/ui/svg-clip-mask";
import { HYPERLIQUID_PATH, HYPERLIQUID_VIEWBOX, HyperliquidMark } from "@/components/brand/marks";
import { site } from "@/lib/config";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import { INTRO_KEY } from "./intro-gate";

/** Longest the glass may hold waiting on the hero's assets. */
const MAX_WAIT_MS = 4000;
/** Emergency exit only, if the dot sequence never reports. */
const SAFETY_TIMEOUT_MS = 6000;
/** The visor portal: after the full sequence, and after a skip. */
const PORTAL_S = 0.9;
const SKIP_S = 0.6;
/** Past the portal plus this much, the loader unmounts regardless. */
const EXIT_SLACK_MS = 500;
/** The root's CSS opacity fade (duration-450) plus a frame. */
const FADE_MS = 500;
/** Reduced motion: the static mark's CSS fade (globals.css) is over by then. */
const REDUCED_MS = 1000;

/** Dot grid geometry, shared by DotTransition and the portal frame. */
const SPACING = 13;
const FILL = 0.62;

/**
 * The lens of /loader/cpu-glass-shade.svg (viewBox 1200 × 520), the visor the
 * dots draw last. The portal opens in this exact shape from the glass centre.
 */
const GLASS_WIDTH = 1200;
const GLASS_ASPECT = 1200 / 520;
const VISOR_LENS =
  "M93 205C113 105 219 53 348 64L600 87L852 64C981 53 1087 105 1107 205L1122 280C1138 360 1082 437 1000 448C856 468 728 423 600 341C472 423 344 468 200 448C118 437 62 360 78 280L93 205Z";
const VISOR_ANCHOR: [number, number] = [600, 260];

/** Places the lens exactly where DotTransition fits the glass image (centred, `FILL` of the grid). */
function glassFrame(width: number, height: number): ClipFrame {
  const cols = Math.max(1, Math.round(width / SPACING));
  const rows = Math.max(1, Math.round(height / SPACING));
  const cells = Math.min(cols, rows * GLASS_ASPECT) * FILL;
  return {
    x: width / 2,
    y: height / 2,
    kx: ((width / cols) * cells) / GLASS_WIDTH,
    ky: ((height / rows) * cells) / GLASS_WIDTH,
  };
}

type Exit = "portal" | "skip";
type Intro = "run" | "seen" | "reduced";

const noopSubscribe = () => () => {};
/** Set before first paint by INTRO_GATE_SCRIPT: repeat visit ("seen") or reduced motion. */
const readIntro = (): Intro => (document.documentElement.dataset.intro as Intro | undefined) ?? "run";

const markSeen = () => {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* private mode */
  }
};

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
 * CPU glass shade, and holds until fonts and the hero art are actually ready.
 * Then the visor itself becomes a portal: the lens opens onto the page that
 * was rendered underneath all along, and grows past the viewport edges.
 * Hidden before paint for repeat visits in the session (see intro-gate) and
 * without JS; reduced motion gets a static mark that fades on its own.
 *
 * run → leaving → done. The page is released (scroll unlocked, loader
 * click-through) the moment it starts leaving; the exit is pure decoration
 * and every path out of it ends in unmounting.
 */
export function SiteLoader() {
  const intro = useSyncExternalStore(noopSubscribe, readIntro, () => "run" as Intro);
  const [phase, setPhase] = useState<"run" | "leaving" | "done">("run");
  const [exit, setExit] = useState<Exit>("portal");
  const [ready, setReady] = useState(false);
  const images = useMemo(() => [markDataUri, "/loader/cpu-glass-shade.svg"], []);
  const finishedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<SVGPathElement>(null);
  const maskRef = useRef<SvgClipMaskHandle>(null);

  /** The only way out of the intro. Idempotent: later calls are no-ops. */
  const finishLoader = useCallback((mode: Exit) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    unlockScroll("loader");
    markSeen();
    setExit(mode);
    setPhase("leaving");
  }, []);

  const skip = useCallback(() => finishLoader("skip"), [finishLoader]);
  const reveal = useCallback(() => finishLoader("portal"), [finishLoader]);

  // Leaving: open the visor portal when it can be measured and animated,
  // otherwise the plain fade. Either way a timer guarantees unmounting.
  useLayoutEffect(() => {
    if (phase !== "leaving") return;
    const done = () => setPhase("done");
    const root = rootRef.current;
    let timer = window.setTimeout(done, FADE_MS);
    let timeline: gsap.core.Timeline | undefined;

    const fadeOut = () => {
      if (root) root.style.opacity = "0";
      window.clearTimeout(timer);
      timer = window.setTimeout(done, FADE_MS);
    };

    const mask = maskRef.current;
    const cover = mask?.coverScale();
    if (!mask || !cover) {
      fadeOut();
    } else {
      try {
        const duration = exit === "skip" ? SKIP_S : PORTAL_S;
        // Time split: the lens clears inside the dotted glass, then dives
        // through it. Scale runs in log space so the growth reads as even.
        const split = exit === "skip" ? 0.22 : 0.3;
        const start = 0.14;
        const end = cover * 1.06;
        const open = gsap.parseEase("power3.out");
        const dive = gsap.parseEase("power2.in");
        const scaleAt = (t: number) =>
          t < split ? start ** (1 - open(t / split)) : end ** dive((t - split) / (1 - split));

        const state = { t: 0 };
        mask.setScale(start);
        timeline = gsap
          .timeline({ onComplete: done })
          .to(state, { t: 1, duration, ease: "none", onUpdate: () => mask.setScale(scaleAt(state.t)) })
          .to(labelsRef.current, { opacity: 0, duration: 0.25, ease: "power1.out" }, 0)
          .to(glassRef.current, { opacity: 0, duration: duration * 0.45, ease: "power1.in" }, duration * split * 0.6)
          .to(mask.rim(), { opacity: 0, duration: duration * 0.35, ease: "power1.in" }, duration * 0.6)
          // Belt and braces: nothing of the veil survives the last frames.
          .to(veilRef.current, { opacity: 0, duration: duration * 0.1, ease: "none" }, duration * 0.9);
        window.clearTimeout(timer);
        timer = window.setTimeout(done, duration * 1000 + EXIT_SLACK_MS);
      } catch {
        timeline?.kill();
        fadeOut();
      }
    }

    return () => {
      window.clearTimeout(timer);
      timeline?.kill();
    };
  }, [phase, exit]);

  // Running: hold the scroll lock, wait for assets, listen for skips.
  useEffect(() => {
    // `intro` is the server snapshot ("run") during hydration, so also read
    // the gate directly: repeat visits must never take the lock at all.
    const gate = readIntro();
    if (intro === "seen" || gate === "seen" || finishedRef.current) return;

    if (gate === "reduced") {
      // CSS fades the static mark out; nothing to lock, wait for or skip.
      const t = window.setTimeout(() => {
        markSeen();
        setPhase("done");
      }, REDUCED_MS);
      return () => window.clearTimeout(t);
    }

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
  }, [intro, skip]);

  if (intro === "seen" || phase === "done") return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "site-loader fixed inset-0 z-100 transition-opacity duration-450 ease-out",
        phase !== "run" && "pointer-events-none",
      )}
      onClick={skip}
      role="presentation"
    >
      <p className="sr-only" role="status">
        Loading {site.name}
      </p>
      <SvgClipMask
        ref={maskRef}
        path={VISOR_LENS}
        anchor={VISOR_ANCHOR}
        frame={glassFrame}
        className="size-full"
        rim={
          <>
            <path ref={glassRef} d={VISOR_LENS} fill="#031613" fillOpacity={0.55} />
            <path d={VISOR_LENS} fill="none" stroke="#00f0e6" strokeOpacity={0.22} strokeWidth={12} vectorEffect="non-scaling-stroke" />
            <path d={VISOR_LENS} fill="none" stroke="#97fce4" strokeOpacity={0.9} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </>
        }
      >
        <div ref={veilRef} className="relative size-full bg-cpu-black">
          {intro !== "reduced" && (
            <DotTransition
              images={images}
              once
              ready={ready}
              onComplete={reveal}
              className="site-loader__dots h-full w-full"
              spacing={SPACING}
              dotSize={1.6}
              maxDotSize={9}
              growDuration={0.7}
              holdDuration={0.2}
              shrinkDuration={0.45}
              gapDuration={0.04}
              fill={FILL}
              dotColor="#97fce4"
              backgroundColor="#0b0f12"
            />
          )}
          <HyperliquidMark className="site-loader__mark absolute left-1/2 top-1/2 w-[min(38vw,13rem)] -translate-x-1/2 -translate-y-1/2 text-mint" />
          <div
            ref={labelsRef}
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-(--gutter) text-paper/70"
          >
            <span className="type-label text-paper/60">{site.name}</span>
            <span className="type-label text-mint/80">${site.ticker}</span>
          </div>
        </div>
      </SvgClipMask>
    </div>
  );
}
