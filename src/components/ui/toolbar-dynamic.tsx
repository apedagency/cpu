"use client";

// Toolbar Dynamic by ibelick / motion-primitives (21st.dev), with the sliding
// active highlight from uiable's Toggle Group Animated Toolbar (21st.dev).
// CPU adaptation: framer-motion + react-use-measure are replaced by GSAP and a
// ResizeObserver, so the site keeps one animation runtime. The signature is
// unchanged — one surface whose panel springs to the measured height of the
// active item's content above a row of icon tabs; tapping the open tab folds
// it away. Controlled, so the editor owns the selection. Leading/trailing
// slots hold the actions that aren't tabs.

import gsap from "gsap";
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-media";
import { cn } from "@/lib/utils";

export interface ToolbarItem {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface ToolbarDynamicProps {
  items: ToolbarItem[];
  active: string | null;
  open: boolean;
  onSelect: (id: string) => void;
  onOpenChange: (open: boolean) => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  label: string;
  className?: string;
}

export function ToolbarDynamic({ items, active, open, onSelect, onOpenChange, leading, trailing, label, className }: ToolbarDynamicProps) {
  const reduced = useReducedMotion();
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const activeItem = items.find((item) => item.id === active) ?? null;
  const shown = open && !!activeItem;

  // Panel height follows the active content's measured height.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!panel || !content) return;
    const fit = (animate: boolean) => {
      const height = shown ? content.offsetHeight : 0;
      if (!animate || reduced) gsap.set(panel, { height });
      else gsap.to(panel, { height, duration: 0.34, ease: "power3.out", overwrite: true });
    };
    fit(true);
    const ro = new ResizeObserver(() => fit(true));
    ro.observe(content);
    return () => ro.disconnect();
  }, [shown, reduced, active]);

  // New content eases in rather than cutting.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || !shown || reduced) return;
    const tween = gsap.fromTo(content, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.26, ease: "power2.out", delay: 0.04 });
    return () => {
      tween.kill();
    };
  }, [active, shown, reduced]);

  // The highlight slides to the active tab.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const indicator = indicatorRef.current;
    if (!row || !indicator) return;
    const place = (animate: boolean) => {
      const button = active ? row.querySelector<HTMLElement>(`[data-tab="${CSS.escape(active)}"]`) : null;
      const vars = button
        ? { x: button.offsetLeft, width: button.offsetWidth, opacity: 1 }
        : { opacity: 0 };
      if (!animate || reduced) gsap.set(indicator, vars);
      else gsap.to(indicator, { ...vars, duration: 0.42, ease: "back.out(1.4)", overwrite: true });
    };
    place(true);
    const ro = new ResizeObserver(() => place(false));
    ro.observe(row);
    return () => ro.disconnect();
  }, [active, reduced]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, onOpenChange]);

  return (
    <div
      className={cn(
        "flex select-none flex-col overflow-hidden rounded-md border border-mint/12 bg-ink-1/72 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(151,252,228,0.06)] backdrop-blur-xl",
        className,
      )}
    >
      <div ref={panelRef} id={panelId} className="h-0 overflow-hidden" aria-hidden={!shown} inert={!shown}>
        <div ref={contentRef} className="border-b border-mint/8 px-4 pb-4 pt-4">
          {activeItem?.content}
        </div>
      </div>
      <div role="toolbar" aria-label={label} className="flex items-stretch gap-1 p-1.5">
        {leading}
        <div ref={rowRef} className="relative flex flex-1 items-stretch justify-center gap-0.5">
          <span
            ref={indicatorRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 rounded-sm bg-mint/10 opacity-0 shadow-[inset_0_-2px_0_var(--cpu-teal)]"
          />
          {items.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                data-tab={item.id}
                disabled={item.disabled}
                aria-pressed={isActive}
                aria-expanded={isActive ? shown : false}
                aria-controls={panelId}
                onClick={() => {
                  if (isActive) {
                    onOpenChange(!open);
                    return;
                  }
                  onSelect(item.id);
                  onOpenChange(true);
                }}
                className={cn(
                  "relative z-10 flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-sm px-2.5 text-paper/60 transition-colors duration-200 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-30 sm:px-3.5",
                  isActive && "text-paper",
                )}
              >
                <span className="[&>svg]:size-[1.15rem]" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="text-[0.625rem] font-semibold uppercase leading-none tracking-[0.12em]">{item.label}</span>
              </button>
            );
          })}
        </div>
        {trailing}
      </div>
    </div>
  );
}

export default ToolbarDynamic;
