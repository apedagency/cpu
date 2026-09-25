"use client";

// Segmented Control by ddoemonn (21st.dev).
// CPU adaptation: the thumb's spring (motion/react) is reproduced with a CSS
// transition on an overshooting curve, so the site ships one animation
// library. The masked label copy riding inside the thumb — the component's
// signature detail — is unchanged. Options may carry a leading visual.

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SEG =
  "flex min-h-10 items-center justify-center gap-2 px-3 py-2 text-center text-[13px] font-medium leading-[18px] tracking-[-0.01em] whitespace-nowrap";

const SPRING = "transform 420ms cubic-bezier(0.34, 1.32, 0.52, 1)";

export type SegmentedOption = {
  value: string;
  label: string;
  /** Optional leading visual (swatch, thumbnail). Decorative. */
  lead?: ReactNode;
  disabled?: boolean;
};

export type SegmentedControlProps = {
  options: SegmentedOption[];
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  /** Below the sm breakpoint show only each option's lead visual. */
  compact?: boolean;
};

export function SegmentedControl({
  options,
  label,
  value,
  defaultValue,
  onValueChange,
  className = "",
  compact = false,
}: SegmentedControlProps) {
  const count = Math.max(1, options.length);
  const template = `repeat(${count}, minmax(0, 1fr))`;

  const [internal, setInternal] = useState(() => defaultValue ?? options[0]?.value ?? "");
  const [hovered, setHovered] = useState(-1);

  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const found = options.findIndex((o) => o.value === current);
  const index = found < 0 ? 0 : found;

  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const emit = useRef(onValueChange);
  useLayoutEffect(() => {
    emit.current = onValueChange;
  }, [onValueChange]);

  const select = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      if (next !== current) emit.current?.(next);
    },
    [controlled, current],
  );

  const seek = useCallback(
    (from: number, dir: number) => {
      let i = from;
      for (let k = 0; k < count; k++) {
        i = (i + dir + count) % count;
        if (!options[i]?.disabled) return i;
      }
      return from;
    },
    [count, options],
  );

  const go = useCallback(
    (i: number) => {
      const option = options[i];
      if (!option || option.disabled) return;
      buttons.current[i]?.focus();
      select(option.value);
    },
    [options, select],
  );

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(seek(i, 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(seek(i, -1));
    } else if (e.key === "Home") {
      e.preventDefault();
      go(seek(count - 1, 1));
    } else if (e.key === "End") {
      e.preventDefault();
      go(seek(0, -1));
    }
  };

  const content = (option: SegmentedOption) => (
    <>
      {option.lead}
      <span className={cn("truncate", compact && option.lead && "max-sm:hidden")}>{option.label}</span>
    </>
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative block w-full select-none rounded-[9px] border border-mint/15 bg-ink-1 p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="relative grid" style={{ gridTemplateColumns: template, touchAction: "manipulation" }}>
        {options.map((option, i) => (
          <span
            key={option.value}
            aria-hidden
            className={cn(
              SEG,
              "pointer-events-none",
              option.disabled
                ? "text-paper/25"
                : hovered === i && i !== index
                  ? "text-paper"
                  : "text-muted-foreground",
            )}
          >
            {content(option)}
          </span>
        ))}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-[6px] bg-teal shadow-[0_1px_2px_rgba(0,0,0,0.5),0_0_24px_-6px_rgba(0,240,230,0.55)] motion-reduce:!transition-none"
          style={{ width: `${100 / count}%`, transform: `translateX(${index * 100}%)`, transition: SPRING }}
        >
          <div
            className="absolute inset-0 motion-reduce:!transition-none"
            style={{ transform: `translateX(${index * -100}%)`, transition: SPRING }}
          >
            <div
              className="absolute inset-y-0 left-0 grid"
              style={{ width: `${count * 100}%`, gridTemplateColumns: template }}
            >
              {options.map((option) => (
                <span key={option.value} className={cn(SEG, "text-ink-1")}>
                  {content(option)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: template }} onPointerLeave={() => setHovered(-1)}>
          {options.map((option, i) => (
            <button
              key={option.value}
              ref={(node) => {
                buttons.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={i === index}
              aria-disabled={option.disabled || undefined}
              tabIndex={i === index ? 0 : -1}
              onClick={() => !option.disabled && select(option.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onPointerEnter={() => !option.disabled && setHovered(i)}
              className="cursor-pointer rounded-[6px] outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--cpu-white)]"
            >
              <span className="sr-only">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SegmentedControl;
