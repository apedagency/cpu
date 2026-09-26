"use client";

// Segmented Control by ddoemonn (21st.dev). CPU adaptation: motion's spring is
// replaced by a GSAP tween so the site keeps one animation runtime, and each
// cell can carry media (the PFP body-angle thumbnails) above its label. The
// signature is unchanged: a radiogroup of equal cells, a thumb that slides to
// the checked cell, roving tabindex with Arrow / Home / End keys. Controlled,
// so the editor owns the value.

import gsap from "gsap";
import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-media";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: string;
  media?: ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, label, value, onValueChange, className }: SegmentedControlProps) {
  const reduced = useReducedMotion();
  const count = Math.max(1, options.length);
  const found = options.findIndex((o) => o.value === value);
  const index = found < 0 ? 0 : found;
  const thumbRef = useRef<HTMLSpanElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const placed = useRef(false);

  // The thumb is one cell wide, so xPercent = index * 100 lands on the cell.
  useLayoutEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb) return;
    if (!placed.current || reduced) {
      gsap.set(thumb, { xPercent: index * 100 });
      placed.current = true;
      return;
    }
    const tween = gsap.to(thumb, { xPercent: index * 100, duration: 0.42, ease: "back.out(1.4)", overwrite: true });
    return () => {
      tween.kill();
    };
  }, [index, reduced]);

  const seek = (from: number, dir: number) => {
    let i = from;
    for (let k = 0; k < count; k++) {
      i = (i + dir + count) % count;
      if (!options[i]?.disabled) return i;
    }
    return from;
  };

  const go = (i: number) => {
    const option = options[i];
    if (!option || option.disabled) return;
    buttons.current[i]?.focus();
    if (option.value !== value) onValueChange(option.value);
  };

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const moves: Record<string, () => number> = {
      ArrowRight: () => seek(i, 1),
      ArrowDown: () => seek(i, 1),
      ArrowLeft: () => seek(i, -1),
      ArrowUp: () => seek(i, -1),
      Home: () => seek(count - 1, 1),
      End: () => seek(0, -1),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    go(move());
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("relative select-none rounded-sm border border-mint/12 bg-ink-1/60 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]", className)}
    >
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, touchAction: "manipulation" }}>
        <span
          ref={thumbRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 rounded-xs bg-mint/10 shadow-[inset_0_0_0_1px_rgba(0,240,230,0.6),0_0_24px_-10px_var(--cpu-teal)]"
          style={{ width: `${100 / count}%` }}
        />
        {options.map((option, i) => {
          const checked = i === index;
          return (
            <button
              key={option.value}
              ref={(node) => {
                buttons.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={option.disabled || undefined}
              tabIndex={checked ? 0 : -1}
              onClick={() => !option.disabled && go(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "relative z-10 flex min-h-11 flex-col items-center justify-center gap-1 rounded-xs px-0.5 pb-1.5 pt-1 text-paper/55 outline-none transition-colors duration-200 hover:text-paper focus-visible:shadow-[inset_0_0_0_2px_var(--cpu-teal)] aria-disabled:opacity-35",
                checked && "text-paper",
              )}
            >
              {option.media}
              <span className="text-[0.625rem] font-semibold uppercase leading-none tracking-[0.1em]">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SegmentedControl;
