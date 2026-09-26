"use client";

// Animated Tabs by educalvolpz (21st.dev), underline variant.
// CPU adaptation: the shared-layout indicator (motion/react layoutId) is a
// GSAP-driven bar measured from the active tab, so the site keeps one
// animation runtime. Keyboard model unchanged: roving tabindex, ←/→, Home/End.
// The bar is the site's teal active-state line (same as the nav).

import gsap from "gsap";
import { useCallback, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-media";
import { cn } from "@/lib/utils";

export interface AnimatedTab {
  id: string;
  label: ReactNode;
}

interface AnimatedTabsProps {
  tabs: AnimatedTab[];
  active: string;
  onChange: (id: string) => void;
  label: string;
  /** id prefix shared with the panels (`${idBase}-panel-${tab}`). */
  idBase?: string;
  className?: string;
  tabClassName?: string;
}

export function AnimatedTabs({ tabs, active, onChange, label, idBase, className, tabClassName }: AnimatedTabsProps) {
  const reduced = useReducedMotion();
  const generated = useId();
  const base = idBase ?? generated;
  const listRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const bar = barRef.current;
    if (!list || !bar) return;
    const place = (animate: boolean) => {
      const tab = list.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(active)}"]`);
      if (!tab) return;
      const vars = { x: tab.offsetLeft, width: tab.offsetWidth };
      if (!animate || reduced) gsap.set(bar, vars);
      else gsap.to(bar, { ...vars, duration: 0.45, ease: "power3.out", overwrite: true });
    };
    place(true);
    const ro = new ResizeObserver(() => place(false));
    ro.observe(list);
    return () => ro.disconnect();
  }, [active, reduced]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const last = tabs.length - 1;
      const next =
        e.key === "ArrowRight" ? (index + 1) % tabs.length : e.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? last : null;
      if (next === null) return;
      e.preventDefault();
      const tab = tabs[next];
      if (!tab) return;
      onChange(tab.id);
      listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(tab.id)}"]`)?.focus();
    },
    [tabs, onChange],
  );

  return (
    <div ref={listRef} role="tablist" aria-label={label} className={cn("relative inline-flex gap-6", className)}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.id}`}
            aria-controls={`${base}-panel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            data-tab-id={tab.id}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "relative pb-2 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal",
              isActive ? "text-paper" : "text-paper/35 hover:text-paper/70",
              tabClassName,
            )}
          >
            {tab.label}
          </button>
        );
      })}
      <span ref={barRef} aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 bg-teal shadow-[0_0_14px_var(--cpu-teal)]" />
    </div>
  );
}

export default AnimatedTabs;
