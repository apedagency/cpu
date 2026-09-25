"use client";

import { Download, ImagePlus, Link2, RotateCcw, Upload } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { drawPfp, loadAssets, type AssetMap, type UserImage } from "./compose";
import { ASSET_SRCS, BACKGROUNDS, EFFECTS, EXPORT_SIZE, KIT_LAYERS, MAX_UPLOAD_BYTES, type LayerId } from "./manifest";
import { cleanTransform, DEFAULT_TRANSFORMS, freshDefaultState, type LayerTransform, type PfpState } from "./state";

const LAYERS: { id: LayerId; label: string; note: string }[] = [
  { id: "userPfp", label: "PFP", note: "Your image" },
  { id: "visor", label: "Visor", note: "CPU glass" },
  { id: "helmet", label: "Helmet", note: "Head kit" },
  { id: "body", label: "Body", note: "Armour kit" },
];

type DragMode = "move" | "scale" | "rotate";
type DragState = {
  id: number;
  layer: LayerId;
  mode: DragMode;
  startX: number;
  startY: number;
  centerX: number;
  centerY: number;
  startDistance: number;
  startAngle: number;
  base: LayerTransform;
};

type GestureState = {
  layer: LayerId;
  startDistance: number;
  startAngle: number;
  base: LayerTransform;
};

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const deg = (radians: number) => (radians * 180) / Math.PI;

async function decodeUpload(file: File): Promise<UserImage> {
  let source: ImageBitmap | HTMLImageElement | null = null;
  let release: (() => void) | null = null;

  try {
    if ("createImageBitmap" in window) {
      source = await createImageBitmap(file, { imageOrientation: "from-image" });
      release = () => source instanceof ImageBitmap && source.close();
    } else {
      const url = URL.createObjectURL(file);
      release = () => URL.revokeObjectURL(url);
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("That image could not be decoded."));
        image.src = url;
      });
    }

    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    const scale = Math.min(1, 3072 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas is unavailable in this browser.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    release?.();
  }
}

function layerBounds(id: LayerId) {
  if (id === "userPfp") return { cx: 0.5, cy: 0.5, w: 0.88, h: 0.88 };
  return KIT_LAYERS.find((layer) => layer.id === id)?.bounds ?? { cx: 0.5, cy: 0.5, w: 0.5, h: 0.5 };
}

function hitLayer(x: number, y: number, state: PfpState, hasImage: boolean): LayerId {
  const order: LayerId[] = ["visor", "helmet", "body", "userPfp"];
  for (const id of order) {
    if (id === "userPfp" && !hasImage) continue;
    const transform = state.transforms[id];
    const angle = (-transform.rotation * Math.PI) / 180;
    const dx = x - (0.5 + transform.x);
    const dy = y - (0.5 + transform.y);
    const localX = (dx * Math.cos(angle) - dy * Math.sin(angle)) / transform.scale + 0.5;
    const localY = (dx * Math.sin(angle) + dy * Math.cos(angle)) / transform.scale + 0.5;
    const bounds = layerBounds(id);
    if (Math.abs(localX - bounds.cx) <= bounds.w / 2 && Math.abs(localY - bounds.cy) <= bounds.h / 2) return id;
  }
  return hasImage ? "userPfp" : "visor";
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3">
      <label htmlFor={id} className="text-xs text-paper/68">{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-[var(--cpu-teal)]"
      />
      <output htmlFor={id} className="tabular text-right font-mono text-[0.6875rem] text-mint/80">{Math.round(value)}{suffix}</output>
    </div>
  );
}

export function Engine() {
  const [state, setState] = useState<PfpState>(() => freshDefaultState());
  const [assets, setAssets] = useState<AssetMap | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [userImage, setUserImage] = useState<UserImage | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [draggingOver, setDraggingOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const gestureRef = useRef<GestureState | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pendingRef = useRef<{ id: LayerId; transform: LayerTransform } | null>(null);
  const updateFrameRef = useRef(0);

  useEffect(() => {
    let alive = true;
    loadAssets(ASSET_SRCS).then((result) => {
      if (!alive) return;
      setAssets(result.assets);
      setMissing(result.missing);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame || !assets) return;
    let raf = 0;
    const paint = () => {
      const css = frame.clientWidth;
      const pixels = Math.min(1400, Math.max(1, Math.round(css * Math.min(window.devicePixelRatio || 1, 2))));
      if (canvas.width !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
      }
      const context = canvas.getContext("2d");
      if (context) drawPfp(context, pixels, state, assets, userImage);
    };
    raf = requestAnimationFrame(paint);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    });
    observer.observe(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [state, assets, userImage]);

  const applyTransform = useCallback((id: LayerId, value: LayerTransform) => {
    setState((previous) => {
      const next = cleanTransform(value);
      const current = previous.transforms[id];
      const transforms = { ...previous.transforms, [id]: next };
      if (previous.linkedKit && (id === "visor" || id === "helmet")) {
        const partner: LayerId = id === "visor" ? "helmet" : "visor";
        const linked = previous.transforms[partner];
        transforms[partner] = cleanTransform({
          ...linked,
          x: linked.x + (next.x - current.x),
          y: linked.y + (next.y - current.y),
          scale: linked.scale * (next.scale / current.scale),
          rotation: linked.rotation + (next.rotation - current.rotation),
        });
      }
      return { ...previous, transforms };
    });
  }, []);

  const scheduleTransform = useCallback((id: LayerId, transform: LayerTransform) => {
    pendingRef.current = { id, transform };
    if (updateFrameRef.current) return;
    updateFrameRef.current = requestAnimationFrame(() => {
      updateFrameRef.current = 0;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) applyTransform(pending.id, pending.transform);
    });
  }, [applyTransform]);

  useEffect(() => () => cancelAnimationFrame(updateFrameRef.current), []);

  const loadLocalFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That image is over the 20 MB limit.");
      return;
    }
    setError("");
    try {
      const decoded = await decodeUpload(file);
      setUserImage(decoded);
      setFileName(file.name);
      setState((previous) => ({
        ...previous,
        selected: "userPfp",
        transforms: { ...previous.transforms, userPfp: { ...DEFAULT_TRANSFORMS.userPfp } },
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That image could not be decoded.");
    }
  }, []);

  const localPoint = (clientX: number, clientY: number) => {
    const rect = frameRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height, rect };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-editor-ui]")) return;
    const point = localPoint(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      gestureRef.current = {
        layer: state.selected,
        startDistance: Math.hypot(b.x - a.x, b.y - a.y),
        startAngle: Math.atan2(b.y - a.y, b.x - a.x),
        base: state.transforms[state.selected],
      };
      dragRef.current = null;
      return;
    }

    const handle = (event.target as HTMLElement).closest<HTMLElement>("[data-handle]")?.dataset.handle as DragMode | undefined;
    const layer = handle ? state.selected : hitLayer(point.x, point.y, state, !!userImage);
    if (layer !== state.selected) setState((previous) => ({ ...previous, selected: layer }));
    const base = state.transforms[layer];
    const centerX = point.rect.left + point.rect.width * (0.5 + base.x);
    const centerY = point.rect.top + point.rect.height * (0.5 + base.y);
    dragRef.current = {
      id: event.pointerId,
      layer,
      mode: handle ?? "move",
      startX: event.clientX,
      startY: event.clientY,
      centerX,
      centerY,
      startDistance: Math.max(1, Math.hypot(event.clientX - centerX, event.clientY - centerY)),
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
      base,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    if (gesture && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      scheduleTransform(gesture.layer, {
        ...gesture.base,
        scale: gesture.base.scale * (distance / gesture.startDistance),
        rotation: gesture.base.rotation + deg(angle - gesture.startAngle),
      });
      return;
    }

    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || drag.id !== event.pointerId || !frame) return;
    if (drag.mode === "move") {
      scheduleTransform(drag.layer, {
        ...drag.base,
        x: drag.base.x + (event.clientX - drag.startX) / frame.clientWidth,
        y: drag.base.y + (event.clientY - drag.startY) / frame.clientHeight,
      });
    } else if (drag.mode === "scale") {
      const distance = Math.max(1, Math.hypot(event.clientX - drag.centerX, event.clientY - drag.centerY));
      scheduleTransform(drag.layer, { ...drag.base, scale: drag.base.scale * (distance / drag.startDistance) });
    } else {
      const angle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX);
      scheduleTransform(drag.layer, { ...drag.base, rotation: drag.base.rotation + deg(angle - drag.startAngle) });
    }
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
    if (pointersRef.current.size < 2) gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const selected = state.selected;
    const transform = state.transforms[selected];
    const move = event.shiftKey ? 0.05 : 0.01;
    const changes: Record<string, Partial<LayerTransform>> = {
      ArrowLeft: { x: transform.x - move },
      ArrowRight: { x: transform.x + move },
      ArrowUp: { y: transform.y - move },
      ArrowDown: { y: transform.y + move },
      "+": { scale: transform.scale + 0.04 },
      "=": { scale: transform.scale + 0.04 },
      "-": { scale: transform.scale - 0.04 },
      "[": { rotation: transform.rotation - 2 },
      "]": { rotation: transform.rotation + 2 },
    };
    const change = changes[event.key];
    if (!change) return;
    event.preventDefault();
    applyTransform(selected, { ...transform, ...change });
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && document.activeElement !== frameRef.current) return;
    event.preventDefault();
    const transform = state.transforms[state.selected];
    applyTransform(state.selected, { ...transform, scale: transform.scale * Math.exp(-event.deltaY * 0.002) });
  };

  const download = async () => {
    if (!assets || !userImage) return;
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable.");
      drawPfp(context, EXPORT_SIZE, state, assets, userImage);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Export failed.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `cpu-${fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-") || "pfp"}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const selectedTransform = state.transforms[state.selected];
  const selectedBounds = layerBounds(state.selected);
  const backgroundOptions = useMemo(() => BACKGROUNDS.map((item) => ({
    value: item.id,
    label: item.label,
    lead: <span className="size-3.5 rounded-full ring-1 ring-mint/30" style={{ background: item.swatch }} />,
  })), []);

  return (
    <section id="engine" tabIndex={-1} aria-labelledby="engine-title" className="relative overflow-hidden px-(--gutter) py-[clamp(5rem,10vw,9rem)]">
      <header className="mb-12 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="type-label mb-4 text-mint">Engine</p>
          <h2 id="engine-title" className="max-w-3xl text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-paper [font-variation-settings:'wdth'_110,'opsz'_120]">
            Put on the CPU glass.
          </h2>
        </div>
        <div className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          <p>Upload your PFP, fit the visor, helmet and body kit, then export a {EXPORT_SIZE} × {EXPORT_SIZE} PNG.</p>
          <p className="mt-2 inline-flex items-center gap-2 text-mint/80"><Link2 className="size-3.5" aria-hidden="true" /> Your image stays in your browser.</p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.92fr)] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-4">
          <div
            ref={frameRef}
            role="application"
            aria-roledescription="PFP editor"
            aria-label={`CPU PFP editor. ${state.selected} layer selected. Drag to move, use handles to scale or rotate, or use the controls after the editor.`}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onKeyDown={onKeyDown}
            onWheel={onWheel}
            onDragOver={(event) => { event.preventDefault(); setDraggingOver(true); }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDraggingOver(false); void loadLocalFile(event.dataTransfer.files[0]); }}
            onPaste={(event) => { const file = [...event.clipboardData.files].find((item) => ACCEPTED_TYPES.has(item.type)); if (file) { event.preventDefault(); void loadLocalFile(file); } }}
            className={cn(
              "group relative aspect-square w-full overflow-hidden rounded-xl border bg-ink-1/75 outline-none backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-teal",
              draggingOver ? "border-teal shadow-[0_0_48px_-14px_var(--cpu-teal)]" : "border-mint/18",
            )}
            style={{ touchAction: "none" }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
            {!assets && <div className="skeleton absolute inset-0" aria-label="Loading CPU kit" />}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                transform: `translate(${state.transforms[state.selected].x * 100}%, ${state.transforms[state.selected].y * 100}%) rotate(${state.transforms[state.selected].rotation}deg) scale(${state.transforms[state.selected].scale})`,
                transformOrigin: "50% 50%",
              }}
            >
              <div
                className="absolute border border-mint/80 shadow-[0_0_0_1px_var(--cpu-ink-1)]"
                style={{
                  left: `${(selectedBounds.cx - selectedBounds.w / 2) * 100}%`,
                  top: `${(selectedBounds.cy - selectedBounds.h / 2) * 100}%`,
                  width: `${selectedBounds.w * 100}%`,
                  height: `${selectedBounds.h * 100}%`,
                }}
              >
                <span data-handle="scale" className="pointer-events-auto absolute -bottom-5 -right-5 grid size-11 cursor-nwse-resize place-items-center rounded-full border border-teal bg-ink-1 shadow-lg">
                  <span className="size-2 rounded-full bg-teal" />
                </span>
                <span data-handle="rotate" className="pointer-events-auto absolute -top-14 left-1/2 grid size-11 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-mint/60 bg-ink-1 shadow-lg">
                  <span className="h-4 w-px bg-mint" />
                </span>
              </div>
            </div>

            {!userImage && (
              <button type="button" data-editor-ui onClick={() => inputRef.current?.click()} className="absolute left-1/2 top-1/2 z-20 flex min-h-28 w-[min(76%,22rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-mint/45 bg-ink-1/88 px-6 text-center text-paper backdrop-blur-md transition-colors hover:border-teal">
                <ImagePlus className="size-7 text-teal" aria-hidden="true" />
                <span className="font-medium">Upload your PFP</span>
                <span className="text-xs text-muted-foreground">PNG, JPEG or WebP · drop, paste or choose a file</span>
              </button>
            )}
            <span className="pointer-events-none absolute left-3 top-3 rounded bg-ink-1/72 px-2 py-1 text-[0.6875rem] text-paper/72 backdrop-blur">{LAYERS.find((layer) => layer.id === state.selected)?.label} selected</span>
            <div aria-hidden="true" className="pointer-events-none absolute inset-[6%] rounded-full border border-dashed border-paper/20 opacity-0 transition-opacity group-focus-visible:opacity-100" />
          </div>

          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => { void loadLocalFile(event.target.files?.[0]); event.target.value = ""; }} />

          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Editable layer">
            {LAYERS.map((layer) => (
              <button key={layer.id} type="button" role="radio" aria-checked={state.selected === layer.id} onClick={() => setState((previous) => ({ ...previous, selected: layer.id }))} className={cn("min-h-14 rounded-md border px-2 text-left transition-colors", state.selected === layer.id ? "border-teal bg-teal/12 text-paper" : "border-mint/14 bg-ink-1/46 text-paper/65 hover:border-mint/40")}>
                <span className="block text-sm font-medium">{layer.label}</span>
                <span className="hidden text-[0.625rem] text-muted-foreground sm:block">{layer.note}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-mint/25 px-4 text-sm font-medium text-paper hover:border-teal hover:text-teal">
              <Upload className="size-4" aria-hidden="true" /> {userImage ? "Replace PFP" : "Upload PFP"}
            </button>
            <button type="button" onClick={() => applyTransform(state.selected, { ...DEFAULT_TRANSFORMS[state.selected] })} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-mint/25 px-4 text-sm font-medium text-paper hover:border-teal hover:text-teal">
              <RotateCcw className="size-4" aria-hidden="true" /> Reset layer
            </button>
            <button type="button" onClick={() => setState(freshDefaultState())} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-mint/25 px-4 text-sm font-medium text-paper hover:border-teal hover:text-teal">Reset all</button>
            <button type="button" disabled={!assets || !userImage || exporting} onClick={() => void download()} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md bg-teal px-5 text-sm font-semibold text-ink-1 transition-[background-color,box-shadow] hover:bg-mint hover:shadow-[0_0_32px_-6px_var(--cpu-teal)] disabled:cursor-not-allowed disabled:opacity-45 max-sm:ml-0 max-sm:w-full max-sm:justify-center">
              <Download className="size-4" aria-hidden="true" /> {exporting ? "Rendering…" : "Export PNG"}
            </button>
          </div>

          <div className="min-h-5 text-sm" role="status" aria-live="polite">
            {error ? <p className="text-fog">{error}</p> : userImage ? <p className="truncate text-muted-foreground">{fileName} · local preview ready</p> : null}
            {missing.length > 0 && <p className="text-fog">{missing.length} CPU kit asset{missing.length === 1 ? "" : "s"} could not load.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-8 rounded-xl border border-mint/12 bg-ink-1/58 p-5 backdrop-blur-md md:p-7">
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="type-label text-mint">Fit layer</p>
                <h3 className="mt-1 text-xl font-semibold text-paper">{LAYERS.find((layer) => layer.id === state.selected)?.label}</h3>
              </div>
              <label className="flex min-h-11 items-center gap-2 text-xs text-paper/72">
                <input type="checkbox" checked={state.linkedKit} onChange={(event) => setState((previous) => ({ ...previous, linkedKit: event.target.checked }))} className="size-4 accent-[var(--cpu-teal)]" />
                Link helmet + visor
              </label>
            </div>
            <div className="space-y-1 border-t border-mint/10 pt-3">
              <SliderRow label="Horizontal" value={selectedTransform.x * 100} min={-50} max={50} step={1} suffix="%" onChange={(value) => applyTransform(state.selected, { ...selectedTransform, x: value / 100 })} />
              <SliderRow label="Vertical" value={selectedTransform.y * 100} min={-50} max={50} step={1} suffix="%" onChange={(value) => applyTransform(state.selected, { ...selectedTransform, y: value / 100 })} />
              <SliderRow label="Scale" value={selectedTransform.scale * 100} min={45} max={180} step={1} suffix="%" onChange={(value) => applyTransform(state.selected, { ...selectedTransform, scale: value / 100 })} />
              <SliderRow label="Rotation" value={selectedTransform.rotation} min={-90} max={90} step={1} suffix="°" onChange={(value) => applyTransform(state.selected, { ...selectedTransform, rotation: value })} />
              <SliderRow label="Opacity" value={selectedTransform.opacity * 100} min={15} max={100} step={1} suffix="%" onChange={(value) => applyTransform(state.selected, { ...selectedTransform, opacity: value / 100 })} />
            </div>
          </div>

          <div>
            <p className="type-label mb-3 text-paper/70">Background</p>
            <SegmentedControl compact label="Background" options={backgroundOptions} value={state.background} onValueChange={(value) => setState((previous) => ({ ...previous, background: value as PfpState["background"] }))} />
          </div>
          <div>
            <p className="type-label mb-3 text-paper/70">Finish</p>
            <SegmentedControl label="Finish" options={EFFECTS.map((item) => ({ value: item.id, label: item.label }))} value={state.effect} onValueChange={(value) => setState((previous) => ({ ...previous, effect: value as PfpState["effect"] }))} />
          </div>
          <div className="border-t border-mint/10 pt-5 text-xs leading-relaxed text-muted-foreground">
            <p>Drag a selected layer. Use the corner handle to scale and the top handle to rotate. Two fingers scale and rotate together.</p>
            <p className="mt-2">Keyboard: arrows move, +/− scale, [/] rotate. The sliders provide a complete non-drag fallback.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
