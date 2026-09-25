// Built using Hyperiux Vault: https://vault.hyperiux.com
// CPU adaptation: header colours and content are slots (the site is dark),
// the closed panel is `inert` so its links leave the tab order, link clicks
// hand navigation back to the page after the panel closes, and the panel's
// media / socials / meta rows take arbitrary content.
"use client";

import gsap from "gsap";
import type { ReactNode, RefObject } from "react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/** Open state + close() for anything rendered in the header or panel. */
interface NavApi {
  isOpen: boolean;
  close: (after?: () => void) => void;
}
const NavContext = createContext<NavApi>({ isOpen: false, close: () => {} });
export const useNavState = () => useContext(NavContext);

/* ------------------------------------------------------------------ *
 * useFocusTrap — keeps keyboard focus inside a container while open,
 * restores it to the trigger on close.
 * ------------------------------------------------------------------ */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const isVisible = (element?: HTMLElement | null): boolean => {
  if (!element || element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  return element.getClientRects().length > 0;
};

const getFocusableElements = (container?: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];
  return (Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]).filter(isVisible);
};

function useFocusTrap({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
  restoreFocus,
}: {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
  /** Read at close time: false when a link is handing focus to the page. */
  restoreFocus: () => boolean;
}) {
  const onEscapeRef = useRef(onEscape);
  useLayoutEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusFrame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? getFocusableElements(container)[0] ?? container;
      target.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(container);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey) {
        if (activeElement === first || !container.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (activeElement === last || !container.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      if (restoreFocus() && previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, initialFocusRef, restoreFocus]);
}

/* ------------------------------------------------------------------ */

const CLIPS = {
  bottom: {
    closedInitial: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
  },
  top: {
    closedInitial: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
  },
  left: {
    closedInitial: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
  },
  right: {
    closedInitial: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
  },
};

const REDUCED_MOTION_FADE_DURATION = 0.2;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

export interface FullscreenNavProps {
  /** Header content left of the toggle (brand, inline links, contract…). Read state with useNavState(). */
  header: ReactNode;
  clipOrigin?: keyof typeof CLIPS;
  overlayBg?: string;
  headerClassName?: string;
  openDuration?: number;
  closeDuration?: number;
  ease?: string;
  /** Hamburger colour while closed / while open. */
  barColor?: string;
  barOpenColor?: string;
  /** Panel content. Read state with useNavState(). */
  children: ReactNode;
}

export function FullscreenNav({
  header,
  clipOrigin = "bottom",
  overlayBg = "#000000",
  headerClassName = "",
  openDuration = 1.2,
  closeDuration = 1.2,
  ease = "power4.inOut",
  barColor = "#ffffff",
  barOpenColor = "#ffffff",
  children,
}: FullscreenNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const overlayRef = useRef<HTMLElement | null>(null);
  const linksWrapperRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(true);

  const { closedInitial, open: openClipPath, closedFinal } = CLIPS[clipOrigin] ?? CLIPS.bottom;

  const onOpenMenu = () => {
    setIsOpen(true);
    restoreFocusRef.current = true;
    timelineRef.current?.kill();
    gsap.set(overlayRef.current, { clipPath: closedInitial, autoAlpha: 1 });
    gsap.set(linksWrapperRef.current, { opacity: 1, scale: 1 });

    if (prefersReducedMotion()) {
      gsap.set(overlayRef.current, { clipPath: openClipPath, autoAlpha: 0 });
      timelineRef.current = gsap.to(overlayRef.current, {
        autoAlpha: 1,
        duration: REDUCED_MOTION_FADE_DURATION,
        ease: "power2.out",
      });
      return;
    }

    const timeline = gsap.timeline();
    timelineRef.current = timeline;
    timeline.to(overlayRef.current, { clipPath: openClipPath, duration: openDuration, delay: 0.05, ease });
  };

  const onCloseMenu = useCallback(
    (after?: () => void) => {
      setIsOpen(false);
      timelineRef.current?.kill();
      if (after) restoreFocusRef.current = false;

      if (prefersReducedMotion()) {
        gsap.set(linksWrapperRef.current, { scale: 1, opacity: 1 });
        timelineRef.current = gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: REDUCED_MOTION_FADE_DURATION,
          ease: "power2.out",
          onComplete: () => {
            gsap.set(overlayRef.current, { clipPath: closedFinal });
          },
        });
        after?.();
        return;
      }

      const timeline = gsap.timeline();
      timelineRef.current = timeline;
      timeline
        .to(linksWrapperRef.current, { scale: 0.94, opacity: 0.5, duration: 0.6, ease: "power2.in" })
        .to(overlayRef.current, { clipPath: closedFinal, duration: closeDuration * 0.8, ease }, "<");
      // Hand navigation back to the page as the panel starts to lift.
      if (after) window.setTimeout(after, 60);
    },
    [closeDuration, closedFinal, ease],
  );

  // A toggle may interrupt a running wipe: each path kills the active
  // timeline and plays from where it is (upstream ignored clicks mid-close).
  const onToggleMenu = () => {
    if (isOpen) onCloseMenu();
    else onOpenMenu();
  };

  // Lock page scroll only while open, so other owners (the intro) keep theirs.
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => () => void timelineRef.current?.kill(), []);

  const shouldRestoreFocus = useCallback(() => restoreFocusRef.current, []);

  useFocusTrap({
    active: isOpen,
    containerRef: rootRef,
    initialFocusRef: toggleButtonRef,
    onEscape: () => onCloseMenu(),
    restoreFocus: shouldRestoreFocus,
  });

  const api = useMemo<NavApi>(() => ({ isOpen, close: onCloseMenu }), [isOpen, onCloseMenu]);

  const bar = isOpen ? barOpenColor : barColor;

  return (
    <NavContext.Provider value={api}>
    <div ref={rootRef}>
      <header
        className={`fixed inset-x-0 top-0 z-70 flex h-16 items-center gap-4 px-(--gutter) md:h-20 ${headerClassName}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {header}
        </div>
        <button
          ref={toggleButtonRef}
          onClick={onToggleMenu}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="site-menu"
          className="-mr-2 flex size-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md px-2.5"
        >
          <span
            style={{ backgroundColor: bar }}
            className={`block h-0.5 w-full transition-all duration-700 ease-in-out motion-reduce:transition-none ${
              isOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            style={{ backgroundColor: bar }}
            className={`block h-0.5 w-full transition-all duration-500 motion-reduce:transition-none ${
              isOpen ? "scale-x-0 opacity-0" : ""
            }`}
          />
          <span
            style={{ backgroundColor: bar }}
            className={`block h-0.5 w-full transition-all duration-700 ease-in-out motion-reduce:transition-none ${
              isOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </header>

      <nav
        id="site-menu"
        ref={overlayRef}
        style={{ clipPath: closedInitial, backgroundColor: overlayBg }}
        className={`fixed inset-0 z-60 flex flex-col overflow-y-auto overscroll-contain ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-label="Site"
        inert={!isOpen}
      >
        <div ref={linksWrapperRef} className="flex min-h-dvh w-full flex-col">
          {children}
        </div>
      </nav>
    </div>
    </NavContext.Provider>
  );
}

/* ------------------------------------------------------------------ *
 * NavLinkHover — each character sits above its own text-shadow copy and
 * rolls up on hover/focus, revealing the copy. Plain text under reduced
 * motion.
 * ------------------------------------------------------------------ */

export function NavLinkHover({
  label,
  href,
  charStagger = 0.015,
  onClick,
}: {
  label: string;
  href: string;
  charStagger?: number;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a href={href} onClick={onClick} className="group/link-hover inline-block no-underline">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="relative inline-block overflow-hidden align-middle leading-[1.08]">
        {[...label].map((char, index) => (
          <span
            key={index}
            className="relative inline-block whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/link-hover:-translate-y-[1.2em] group-focus-visible/link-hover:-translate-y-[1.2em] motion-reduce:transition-none motion-reduce:group-hover/link-hover:translate-y-0"
            style={{ textShadow: "0 1.2em currentColor", transitionDelay: `${index * charStagger}s` }}
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
    </a>
  );
}

/* ------------------------------------------------------------------ *
 * useStaggerReveal — the panel's staged entrance, keyed off `isOpen`.
 * Elements opt in with data-reveal="head|link|media|social|meta".
 * Instant under reduced motion.
 * ------------------------------------------------------------------ */

export function useStaggerReveal(isOpen: boolean, rootRef: RefObject<HTMLElement | null>, delay = 0.9) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (k: string) => Array.from(root.querySelectorAll<HTMLElement>(`[data-reveal="${k}"]`));
    const groups = { head: q("head"), link: q("link"), media: q("media"), social: q("social"), meta: q("meta") };
    const all = Object.values(groups).flat();
    gsap.killTweensOf(all);
    if (!isOpen) return;

    if (prefersReducedMotion()) {
      gsap.set(all, { y: 0, opacity: 1, scale: 1 });
      return;
    }
    const d = Math.max(delay - 0.2, 0);
    gsap.fromTo(groups.head, { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: d });
    gsap.fromTo(groups.link, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out", stagger: 0.07, delay: d });
    gsap.fromTo(groups.media, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.04, delay: d + 0.1 });
    gsap.fromTo(groups.social, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", stagger: 0.06, delay: d + 0.2 });
    gsap.fromTo(groups.meta, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", delay: d + 0.25 });
  }, [isOpen, delay, rootRef]);
}
