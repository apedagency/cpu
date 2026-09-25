"use client";

import { Check, Download, Link2, RotateCcw, Shuffle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AmountSlider } from "@/components/ui/amount-slider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";
import { drawPfp, loadAssets, type AssetMap } from "./compose";
import { BADGES, EXPORT_SIZE, LIGHTS, manifest } from "./manifest";
import {
  DEFAULT_STATE,
  decodeState,
  encodeState,
  NAME_MAX,
  newSeed,
  randomState,
  sanitizeName,
  ZOOM_MAX,
  ZOOM_MIN,
  type PfpState,
} from "./state";

const ALL_SRCS = [
  ...manifest.base.map((b) => b.src),
  ...manifest.backgrounds.flatMap((b) => (b.kind === "image" ? [b.src] : [])),
  ...manifest.accessories.map((a) => a.src),
];

const subscribeUrl = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};
const readPfpParam = () => new URLSearchParams(window.location.search).get("pfp");

function useCanvasFont() {
  const [family, setFamily] = useState("system-ui, sans-serif");
  useEffect(() => {
    document.fonts?.ready.then(() => setFamily(getComputedStyle(document.body).fontFamily || "system-ui, sans-serif"));
  }, []);
  return family;
}

function Control({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="type-label text-paper/70">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Engine() {
  // A shared composition arrives as ?pfp=…; edits layer on top of it.
  const pfpParam = useSyncExternalStore(subscribeUrl, readPfpParam, () => null);
  const fromUrl = useMemo(() => decodeState(pfpParam), [pfpParam]);
  const [edited, setEdited] = useState<PfpState | null>(null);
  const state = edited ?? fromUrl ?? DEFAULT_STATE;
  const [assets, setAssets] = useState<AssetMap | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [circleGuide, setCircleGuide] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; sx: number; sy: number } | null>(null);
  const font = useCanvasFont();
  const nameId = useId();
  const { copy, copied } = useCopy();

  useEffect(() => {
    let alive = true;
    loadAssets(ALL_SRCS).then(({ assets, missing }) => {
      if (!alive) return;
      setAssets(assets);
      setMissing(missing);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Live preview: same compositor as the export, at the element's pixel size.
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame || !assets) return;
    let raf = 0;
    const paint = () => {
      const css = frame.clientWidth;
      const px = Math.min(1400, Math.round(css * Math.min(window.devicePixelRatio || 1, 2)));
      if (canvas.width !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) drawPfp(ctx, px, state, assets, font);
    };
    raf = requestAnimationFrame(paint);
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    });
    ro.observe(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [state, assets, font]);

  const update = useCallback(
    (patch: Partial<PfpState>) => setEdited((prev) => ({ ...(prev ?? fromUrl ?? DEFAULT_STATE), ...patch })),
    [fromUrl],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    u.hash = "engine";
    u.searchParams.set("pfp", encodeState(state));
    return u.toString();
  }, [state]);

  const download = async () => {
    if (!assets) return;
    setExporting(true);
    try {
      const c = document.createElement("canvas");
      c.width = EXPORT_SIZE;
      c.height = EXPORT_SIZE;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      drawPfp(ctx, EXPORT_SIZE, state, assets, font);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
      if (!blob) throw new Error("Export failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cpu-pfp-${state.seed}-${state.base}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setExporting(false);
    }
  };

  /* Drag / keyboard framing on the preview. */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: state.x, sy: state.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const frame = frameRef.current;
    if (!d || d.id !== e.pointerId || !frame) return;
    const size = frame.clientWidth;
    update({
      x: Math.max(-0.5, Math.min(0.5, d.sx + (e.clientX - d.x) / size)),
      y: Math.max(-0.5, Math.min(0.5, d.sy + (e.clientY - d.y) / size)),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, Partial<PfpState>> = {
      ArrowLeft: { x: Math.max(-0.5, state.x - step) },
      ArrowRight: { x: Math.min(0.5, state.x + step) },
      ArrowUp: { y: Math.max(-0.5, state.y - step) },
      ArrowDown: { y: Math.min(0.5, state.y + step) },
      "+": { zoom: Math.min(ZOOM_MAX, state.zoom + 0.05) },
      "=": { zoom: Math.min(ZOOM_MAX, state.zoom + 0.05) },
      "-": { zoom: Math.max(ZOOM_MIN, state.zoom - 0.05) },
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    update(m);
  };

  const baseOptions = manifest.base.map((b) => ({
    value: b.id,
    label: b.label,
    lead: (
      <span className="relative size-5 shrink-0 overflow-hidden rounded-full bg-ink-3">
        <Image src={b.src} alt="" fill sizes="20px" className="object-cover object-top" />
      </span>
    ),
  }));
  const bgOptions = manifest.backgrounds.map((b) => ({
    value: b.id,
    label: b.label,
    lead: <span className="size-3.5 shrink-0 rounded-full ring-1 ring-mint/30" style={{ background: b.swatch }} />,
  }));

  const zoomPct = Math.round(state.zoom * 100);

  return (
    <section
      id="engine"
      tabIndex={-1}
      aria-labelledby="engine-title"
      className="relative overflow-hidden bg-[linear-gradient(180deg,#0b0f12_0%,#04201b_40%,#031613_100%)] px-(--gutter) py-[clamp(5rem,10vw,9rem)] outline-none"
    >
      <header className="mb-12 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="type-label mb-4 text-mint">Engine</p>
          <h2
            id="engine-title"
            className="max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-paper [font-variation-settings:'wdth'_110,'opsz'_120]"
          >
            Build your CPU picture.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Official CPU art, layered in your browser. Drag to frame, then export a {EXPORT_SIZE} × {EXPORT_SIZE} PNG.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
        {/* Preview */}
        <div className="flex flex-col gap-4">
          <div
            ref={frameRef}
            role="application"
            aria-roledescription="PFP preview"
            aria-label="Profile picture preview. Drag, or use arrow keys to move the character and plus or minus to zoom."
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
            className="group relative aspect-square w-full cursor-grab touch-none select-none overflow-hidden rounded-xl border border-mint/15 bg-ink-1 outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-teal"
          >
            <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
            {!assets && <div className="skeleton absolute inset-0" aria-label="Loading layers" />}
            {circleGuide && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-paper/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            )}
            <span className="pointer-events-none absolute left-3 top-3 rounded bg-ink-1/70 px-2 py-1 text-[0.6875rem] text-paper/70 backdrop-blur">
              Drag to frame
            </span>
          </div>

          {missing.length > 0 && (
            <p className="text-sm text-fog" role="status">
              {missing.length} layer{missing.length > 1 ? "s" : ""} could not load and {missing.length > 1 ? "are" : "is"} left out.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEdited(randomState(newSeed(), state.name))}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-mint/25 px-4 text-sm font-medium text-paper transition-colors hover:border-teal hover:text-teal"
            >
              <Shuffle className="size-4" aria-hidden="true" />
              Randomize
            </button>
            <button
              type="button"
              onClick={() => setEdited(DEFAULT_STATE)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-mint/25 px-4 text-sm font-medium text-paper transition-colors hover:border-teal hover:text-teal"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => void copy(shareUrl)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-mint/25 px-4 text-sm font-medium text-paper transition-colors hover:border-teal hover:text-teal"
            >
              {copied ? <Check className="size-4 text-teal" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
              <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
            </button>
            <button
              type="button"
              onClick={() => void download()}
              disabled={!assets || exporting}
              className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md bg-teal px-5 text-sm font-semibold text-ink-1 transition-[background-color,box-shadow] hover:bg-mint hover:shadow-[0_0_32px_-6px_var(--cpu-teal)] disabled:opacity-60 max-sm:ml-0 max-sm:w-full max-sm:justify-center"
            >
              <Download className="size-4" aria-hidden="true" />
              {exporting ? "Rendering…" : "Download PNG"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Seed <span className="tabular text-paper/80">{state.seed}</span> — the same seed always randomizes to the same picture.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-8">
          <Control label="Character">
            <SegmentedControl label="Character" options={baseOptions} value={state.base} onValueChange={(v) => update({ base: v as PfpState["base"], x: 0, y: 0 })} />
          </Control>
          <Control label="Background">
            <SegmentedControl compact label="Background" options={bgOptions} value={state.background} onValueChange={(v) => update({ background: v as PfpState["background"] })} />
          </Control>
          <Control label="Light">
            <SegmentedControl
              label="Light"
              options={LIGHTS.map((l) => ({ value: l.id, label: l.label }))}
              value={state.light}
              onValueChange={(v) => update({ light: v as PfpState["light"] })}
            />
          </Control>
          <Control label="Badge" hint="Official Hyperliquid mark">
            <SegmentedControl
              label="Badge"
              options={BADGES.map((b) => ({ value: b.id, label: b.label }))}
              value={state.badge}
              onValueChange={(v) => update({ badge: v as PfpState["badge"] })}
            />
          </Control>
          <Control label="Zoom" hint={`${zoomPct}%`}>
            <AmountSlider
              min={ZOOM_MIN * 100}
              max={ZOOM_MAX * 100}
              step={1}
              value={[zoomPct]}
              onValueChange={([v]) => v !== undefined && update({ zoom: v / 100 })}
              aria-label="Zoom"
              aria-valuetext={`${zoomPct} percent`}
            />
          </Control>
          <Control label="Name tag" hint={`${state.name.length}/${NAME_MAX}`}>
            <input
              id={nameId}
              aria-label="Name tag"
              value={state.name}
              maxLength={NAME_MAX}
              onChange={(e) => update({ name: sanitizeName(e.target.value) })}
              placeholder="Optional"
              autoComplete="off"
              className="h-11 rounded-md border border-mint/20 bg-ink-1 px-3 text-paper outline-none transition-colors placeholder:text-paper/30 focus:border-teal"
            />
          </Control>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-paper/80">
            <input
              type="checkbox"
              checked={circleGuide}
              onChange={(e) => setCircleGuide(e.target.checked)}
              className="size-4 accent-[var(--cpu-teal)]"
            />
            Show round-avatar guide while framing
          </label>
          <p className={cn("text-xs leading-relaxed text-muted-foreground")}>
            Layers come from the official CPU renders. More accessory layers slot in as new art is published.
          </p>
        </div>
      </div>
    </section>
  );
}
