"use client";

// Balance Chart by ssychui (21st.dev) — originally ShapeShift's BalanceChart
// redrawn in plain SVG. CPU adaptation: plots a real candle series instead of
// the seeded demo walk; x is scaled by timestamp (sparse trading shows as
// real gaps, never interpolated), labels come from the data, and the plot
// carries loading / error / empty states plus a screen-reader summary.

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

const UP = "var(--chart-2)";
const DOWN = "var(--chart-down)";
const HAIRLINE = "var(--border)";
const SURFACE = "var(--card)";
const TEXT = "var(--foreground)";
const TEXT_MUTED = "var(--muted-foreground)";

const W = 640;
const H = 240;
const STROKE = 2.1;

export interface ChartPoint {
  /** Unix seconds. */
  t: number;
  v: number;
}

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)},${(p1.y + (p2.y - p0.y) / 6).toFixed(2)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)},${(p2.y - (p3.y - p1.y) / 6).toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export interface BalanceChartProps<T extends string> {
  points: ChartPoint[];
  /** Window the points were requested for (unix seconds) — sets the x domain. */
  domain: [number, number];
  status: "loading" | "ready" | "error";
  timeframes: readonly T[];
  timeframe: T;
  onTimeframe: (tf: T) => void;
  formatValue: (v: number) => string;
  formatTime: (t: number) => string;
  /** Axis labels, derived by the caller from the domain. */
  xLabels: { t: number; label: string }[];
  ariaLabel: string;
  errorSlot?: ReactNode;
  className?: string;
}

export default function BalanceChart<T extends string>({
  points,
  domain,
  status,
  timeframes,
  timeframe,
  onTimeframe,
  formatValue,
  formatTime,
  xLabels,
  ariaLabel,
  errorSlot,
  className,
}: BalanceChartProps<T>) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [plotW, setPlotW] = useState(W);

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPlotW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const N = points.length;
  const [t0, t1] = domain;
  const span = Math.max(1, t1 - t0);
  const nx = (t: number) => ((t - t0) / span) * W;

  /* SMOOTHING HAS A THRESHOLD (from the original): only when points sit
     closer than two stroke widths does the line smooth; the readout always
     reports the real value. */
  const avgGapPx = N > 1 ? ((nx(points[N - 1].t) - nx(points[0].t)) / (N - 1)) * (plotW / W) : Infinity;
  const smooth = avgGapPx < 2 * STROKE;

  const geo = useMemo(() => {
    if (N === 0) return null;
    const vals = points.map((p) => p.v);
    const drawn = vals.slice();
    if (smooth) {
      for (let pass = 0; pass < 2; pass++) {
        const src = drawn.slice();
        for (let i = 0; i < N; i++) {
          const lo = Math.max(0, i - 3);
          const hi = Math.min(N - 1, i + 3);
          let sum = 0;
          for (let j = lo; j <= hi; j++) sum += src[j];
          drawn[i] = sum / (hi - lo + 1);
        }
      }
    }
    const lo = Math.min(...drawn);
    const hi = Math.max(...drawn);
    const ny = (val: number) => H - 14 - ((val - lo) / (hi - lo || 1)) * (H - 44);
    const xy = drawn.map((v, i) => ({ x: nx(points[i].t), y: ny(v) }));
    const d =
      N === 1
        ? `M${xy[0].x - 1},${xy[0].y} L${xy[0].x + 1},${xy[0].y}`
        : smooth
          ? smoothPath(xy)
          : xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const rawLo = Math.min(...vals);
    const rawHi = Math.max(...vals);
    return {
      pts: vals.map((val, i) => ({ x: xy[i].x, y: xy[i].y, val, t: points[i].t })),
      path: d,
      area: `${d} L${xy[N - 1].x},${H} L${xy[0].x},${H} Z`,
      min: rawLo,
      max: rawHi,
      iMin: vals.indexOf(rawLo),
      iMax: vals.indexOf(rawHi),
      up: vals[N - 1] >= vals[0],
      first: vals[0],
      last: vals[N - 1],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nx derives from domain
  }, [points, smooth, t0, t1, N]);

  const hue = geo?.up === false ? DOWN : UP;
  const hovered = hover != null && geo ? geo.pts[hover] : null;
  const cardRight = hovered ? hovered.x / W < 0.5 : false;
  const edge = (x: number) =>
    (x / W) * 100 <= 12
      ? { left: 0 }
      : (x / W) * 100 >= 88
        ? { right: 0 }
        : { left: `${(x / W) * 100}%`, transform: "translateX(-50%)" };

  const scrubTo = (clientX: number) => {
    if (!geo) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < geo.pts.length; i++) if (Math.abs(geo.pts[i].x - x) < Math.abs(geo.pts[best].x - x)) best = i;
    setHover(best);
  };

  const summary = geo
    ? `${ariaLabel}: ${N} trading intervals. First ${formatValue(geo.first)}, latest ${formatValue(geo.last)}, high ${formatValue(geo.max)}, low ${formatValue(geo.min)}.`
    : ariaLabel;

  return (
    <div className={`w-full ${className ?? ""}`}>
      <div
        className="rounded-md pb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={geo ? 0 : -1}
        role="group"
        aria-label={`${ariaLabel}. Use the left and right arrow keys to read values.`}
        onFocus={() => setHover((h) => h ?? (N ? N - 1 : null))}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (!N) return;
          const step = e.shiftKey ? 10 : 1;
          const at = hover ?? N - 1;
          const next =
            e.key === "ArrowLeft"
              ? at - step
              : e.key === "ArrowRight"
                ? at + step
                : e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? N - 1
                    : null;
          if (e.key === "Escape") setHover(null);
          if (next === null) return;
          e.preventDefault();
          setHover(Math.max(0, Math.min(N - 1, next)));
        }}
      >
        <p className="sr-only">{summary}</p>
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-[clamp(200px,32vw,320px)] w-full cursor-crosshair"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ touchAction: "pan-y" }}
            onPointerDown={(e) => scrubTo(e.clientX)}
            onPointerMove={(e) => scrubTo(e.clientX)}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setHover(null);
            }}
          >
            <defs>
              <linearGradient id="cpu-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={geo?.up === false ? "var(--chart-down)" : "var(--chart-2)"} stopOpacity="0.2" />
                <stop offset="100%" stopColor={geo?.up === false ? "var(--chart-down)" : "var(--chart-2)"} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke={HAIRLINE} strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
            ))}
            {geo && (
              <>
                <path d={geo.area} fill="url(#cpu-chart-fill)" />
                <path
                  d={geo.path}
                  fill="none"
                  stroke={hue}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "drop-shadow(0 0 6px rgb(0 240 230 / 0.35))" }}
                />
              </>
            )}
          </svg>

          {status === "loading" && !geo && <div className="skeleton absolute inset-0 rounded-md" aria-hidden="true" />}
          {status !== "loading" && !geo && (
            <div className="absolute inset-0 grid place-items-center text-center text-sm text-muted-foreground">
              {status === "error" ? errorSlot : "No trades in this window yet."}
            </div>
          )}

          {hovered && (
            <>
              <i
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-0 border-l border-dashed"
                style={{ left: `${(hovered.x / W) * 100}%`, borderColor: "var(--chart-1)", opacity: 0.55 }}
              />
              <i
                aria-hidden
                className="pointer-events-none absolute block h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${(hovered.x / W) * 100}%`, top: `${(hovered.y / H) * 100}%`, background: hue, boxShadow: `0 0 0 1.5px ${SURFACE}` }}
              />
            </>
          )}
          {geo && N > 1 && (
            <>
              <span
                className="pointer-events-none absolute text-[11px] font-medium tabular-nums"
                style={{ ...edge(geo.pts[geo.iMax].x), top: `${(geo.pts[geo.iMax].y / H) * 100}%`, marginTop: -18, color: TEXT_MUTED }}
              >
                {formatValue(geo.max)}
              </span>
              <span
                className="pointer-events-none absolute text-[11px] font-medium tabular-nums"
                style={{ ...edge(geo.pts[geo.iMin].x), top: `${(geo.pts[geo.iMin].y / H) * 100}%`, marginTop: 8, color: TEXT_MUTED }}
              >
                {formatValue(geo.min)}
              </span>
            </>
          )}
          {hovered && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border px-2.5 py-1.5"
              role="status"
              style={{
                left: `${(hovered.x / W) * 100}%`,
                top: `clamp(2px, calc(${(hovered.y / H) * 100}% - 22px), calc(100% - 52px))`,
                transform: cardRight ? "translateX(14px)" : "translateX(calc(-100% - 14px))",
                background: SURFACE,
                borderColor: HAIRLINE,
                boxShadow: "0 8px 24px -6px rgba(0,0,0,0.5)",
              }}
            >
              <div className="text-[13px] font-bold tabular-nums" style={{ color: TEXT }}>
                {formatValue(hovered.val)}
              </div>
              <div className="text-[10px] tabular-nums" style={{ color: TEXT_MUTED }}>
                {formatTime(hovered.t)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-1 h-4 text-[11px] tabular-nums" style={{ color: TEXT_MUTED }} aria-hidden="true">
        {xLabels.map((l) => {
          const f = (l.t - t0) / span;
          return (
            <span
              key={l.t}
              className="absolute top-0 whitespace-nowrap"
              style={f < 0.08 ? { left: 0 } : f > 0.92 ? { right: 0 } : { left: `${f * 100}%`, transform: "translateX(-50%)" }}
            >
              {l.label}
            </span>
          );
        })}
      </div>

      <div className="relative mt-5 flex w-full max-w-[320px] gap-1" role="radiogroup" aria-label="Timeframe">
        <span
          aria-hidden
          className="absolute bottom-1 left-0 h-0.5 bg-teal shadow-[0_0_10px_var(--cpu-teal)] transition-transform duration-[380ms] ease-[cubic-bezier(0.34,1.16,0.5,1)] motion-reduce:transition-none"
          style={{
            width: `calc((100% - ${(timeframes.length - 1) * 4}px) / ${timeframes.length})`,
            transform: `translateX(calc(${timeframes.indexOf(timeframe)} * (100% + 4px)))`,
          }}
        />
        {timeframes.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            onClick={() => onTimeframe(t)}
            aria-checked={timeframe === t}
            className="relative z-1 h-11 flex-1 text-[12px] font-semibold tracking-[0.08em] tabular-nums transition-[color,transform] duration-200 active:scale-[0.94] motion-reduce:transition-none"
            style={{ color: timeframe === t ? TEXT : TEXT_MUTED }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
