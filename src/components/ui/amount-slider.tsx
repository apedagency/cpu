"use client";

// Amount Slider by serafimcloud (21st.dev). Engine unchanged; CPU adaptation:
// the readout renders a pre-formatted string (separators get their own
// static columns) and the track/thumb read the CPU tokens.

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";
import { cn } from "@/lib/utils";

const CELL = 6;
const GAP = 1;
const THUMB = 24;

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Amount slider rendered as a live grid of shimmering squares in the theme's
 * accent colour. A tail of busy squares trails the thumb and grows with the
 * value. Honors prefers-reduced-motion, pauses offscreen or on a hidden tab.
 */
export function AmountSlider({
  className,
  min = 0,
  max = 100,
  stops,
  onValueChange,
  "aria-label": ariaLabel,
  "aria-valuetext": ariaValueText,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  stops?: number[];
  "aria-valuetext"?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const trackRef = React.useRef<HTMLSpanElement | null>(null);
  const drawRef = React.useRef<((now: number) => void) | null>(null);

  const value = Array.isArray(props.value)
    ? props.value
    : Array.isArray(props.defaultValue)
      ? props.defaultValue
      : [min];
  const current = value[value.length - 1] ?? min;
  const fraction = Math.min(Math.max((current - min) / (max - min || 1), 0), 1);
  const fractionRef = React.useRef(fraction);
  React.useLayoutEffect(() => {
    fractionRef.current = fraction;
  }, [fraction]);

  const sortedStops = React.useMemo(
    () => (stops && stops.length ? [...stops].sort((a, b) => a - b) : null),
    [stops],
  );
  const snap = (v: number) => {
    if (!sortedStops) return v;
    let best = sortedStops[0];
    for (const s of sortedStops) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
    return best;
  };
  const handleValueChange = (vals: number[]) => {
    onValueChange?.(sortedStops ? vals.map(snap) : vals);
  };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!sortedStops) return;
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : event.key === "Home"
            ? "home"
            : event.key === "End"
              ? "end"
              : null;
    if (delta === null) return;
    event.preventDefault();
    event.stopPropagation();
    const idx = sortedStops.indexOf(snap(current));
    const next =
      delta === "home"
        ? 0
        : delta === "end"
          ? sortedStops.length - 1
          : Math.min(sortedStops.length - 1, Math.max(0, idx + delta));
    onValueChange?.([sortedStops[next]]);
  };

  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;

    let accent = "rgb(0 240 230)";
    const readAccent = () => {
      const v = getComputedStyle(track).color.trim();
      if (v) accent = v;
    };
    readAccent();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = track.clientWidth;
      h = track.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) drawRef.current?.(performance.now());
    };

    let last = performance.now();
    let phase = 0;
    let hintPhase = 0;
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const fill = fractionRef.current;
      phase += dt * (0.3 + fill * 3.2);
      hintPhase += dt;
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / CELL);
      const rows = Math.ceil(h / CELL);
      const sq = CELL - GAP;
      const fillPx = THUMB / 2 + fill * (w - THUMB);
      const bandPx = fill * 0.6 * w;
      const hintStrength = 0.15 * (1 - fill);
      for (let cx = 0; cx < cols; cx++) {
        const cellPx = cx * CELL + CELL / 2;
        let colBase: number;
        let isTail: boolean;
        if (cellPx <= fillPx) {
          if (bandPx <= 0.5) continue;
          const band = 1 - (fillPx - cellPx) / bandPx;
          if (band <= 0) continue;
          colBase = band * band;
          isTail = true;
        } else {
          if (hintStrength <= 0.002) continue;
          const reach = w - fillPx;
          const along = reach > 0 ? (cellPx - fillPx) / reach : 0;
          const envelope = Math.sin(along * Math.PI);
          const pulse = 0.5 + 0.5 * Math.sin((cellPx / w) * 5 - hintPhase * 4.5);
          colBase = hintStrength * envelope * pulse;
          if (colBase <= 0.002) continue;
          isTail = false;
        }
        for (let cy = 0; cy < rows; cy++) {
          const ph = hash(cx, cy) * Math.PI * 2;
          const stat = 0.6 + 0.4 * hash(cx + 7.3, cy - 3.1);
          const twinkle = 0.5 + 0.5 * Math.sin(phase * 1.7 + ph);
          let anim: number;
          if (reduce) anim = 1;
          else if (isTail) {
            const flicker = Math.sin(phase * 2.4 + cx * 0.9 + cy * 0.4 + ph);
            anim = 0.35 + 0.325 * (1 + flicker);
          } else anim = 0.6 + 0.4 * twinkle;
          let a = colBase * stat * anim;
          a = a < 0 ? 0 : a > 1 ? 1 : a;
          if (a < 0.015) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = accent;
          ctx.fillRect(cx * CELL, cy * CELL, sq, sq);
          ctx.globalAlpha = 1;
        }
      }
      if (running && !reduce) raf = requestAnimationFrame(draw);
    };
    drawRef.current = draw;

    resize();
    if (reduce) draw(performance.now());
    else raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(track);

    const io = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting ?? true;
      if (visible && !running && !reduce) {
        running = true;
        raf = requestAnimationFrame(draw);
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(track);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduce && !running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      drawRef.current = null;
    };
  }, [reduce]);

  React.useEffect(() => {
    if (reduce) drawRef.current?.(performance.now());
  }, [fraction, reduce]);

  return (
    <SliderPrimitive.Root
      data-slot="amount-slider"
      min={min}
      max={max}
      className={cn("relative flex w-full touch-none items-center select-none data-disabled:opacity-50", className)}
      onValueChange={handleValueChange}
      onKeyDownCapture={handleKeyDown}
      {...props}
    >
      <SliderPrimitive.Track
        ref={trackRef}
        className="relative h-9 w-full grow overflow-hidden rounded-lg bg-muted text-primary"
      >
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        {sortedStops?.map((s) => {
          const f = (s - min) / (max - min || 1);
          const active = s <= current + 1e-6;
          return (
            <span
              key={s}
              className={cn(
                "pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200",
                active ? "bg-foreground" : "bg-foreground/30",
              )}
              style={{ left: `calc(${f} * (100% - ${THUMB}px) + ${THUMB / 2}px)` }}
            />
          );
        })}
      </SliderPrimitive.Track>
      {value.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={ariaLabel}
          aria-valuetext={ariaValueText}
          className="block h-10 w-6 shrink-0 cursor-grab rounded-lg bg-foreground shadow-md ring-ring/40 transition-shadow duration-300 ease-out outline-none hover:ring-2 focus-visible:ring-2 active:cursor-grabbing disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

/**
 * One column per character; digits roll to their new value instead of
 * cutting, separators sit still. Tabular figures, no layout shift.
 */
export function AmountReadout({
  text,
  label,
  className,
}: {
  /** Pre-formatted value, e.g. "12,500,000". */
  text: string;
  /** Accessible reading of the value. */
  label: string;
  className?: string;
}) {
  const chars = text.split("");
  return (
    <span
      className={cn("inline-flex items-baseline font-semibold tabular-nums text-foreground", className)}
      role="status"
      aria-label={label}
    >
      {chars.map((ch, index) =>
        /\d/.test(ch) ? (
          <RollingDigit key={`${chars.length - index}`} digit={Number(ch)} />
        ) : (
          <span key={`${chars.length - index}-s`} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

function RollingDigit({ digit }: { digit: number }) {
  return (
    <span aria-hidden="true" className="relative inline-block h-[1em] w-[0.62em] overflow-hidden leading-none">
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((candidate) => (
          <span key={candidate} className="flex h-[1em] items-center justify-center">
            {candidate}
          </span>
        ))}
      </span>
    </span>
  );
}
