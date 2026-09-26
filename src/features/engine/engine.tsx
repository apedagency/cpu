"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import gsap from "gsap";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Eye, EyeOff, Glasses, ImagePlus, RotateCcw, ScanFace, Shirt } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ToolbarDynamic, type ToolbarItem } from "@/components/ui/toolbar-dynamic";
import { useFinePointer, useReducedMotion } from "@/hooks/use-media";
import { cn } from "@/lib/utils";
import { drawPfp, hitTest, loadBody, loadKit, outlineBox, type Bodies, type Kit, type UserImage } from "./compose";
import { ACCEPTED_TYPES, BODIES, BODY_ANGLES, DEFAULTS, EXPORT_SIZE, MAX_UPLOAD_BYTES, type BodyAngle, type LayerId } from "./manifest";
import { clean, freshState, LIMITS, resetLayer, type PfpState, type Transform } from "./state";

const deg = (rad: number) => (rad * 180) / Math.PI;
/** Preview backing-store cap; export always renders at EXPORT_SIZE. */
const PREVIEW_MAX = 1400;
/** How long after an edit a touch on the selected PFP still drags it rather than scrolling. */
const PFP_TOUCH_MS = 6000;

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

/* ------------------------------------------------------------------ */
/* Selection frame: the rotated bounds of what a gesture will move.    */
/* ------------------------------------------------------------------ */

function frameFor(state: PfpState, size: number, image: UserImage | null): DOMPoint[] | null {
  if (state.selected === "userPfp") return null;
  const b = outlineBox(state.selected, state, size, image);
  if (!b) return null;
  return [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x + b.w, b.y + b.h],
    [b.x, b.y + b.h],
  ].map(([x, y]) => b.matrix.transformPoint(new DOMPoint(x, y)));
}

/** Pivot (canvas px) of a layer: the eye line for the glasses, the collar for the body, the centre for the PFP. */
function pivotFor(state: PfpState, layer: LayerId, size: number, image: UserImage | null) {
  const box = outlineBox(layer, state, size, image);
  return box ? box.matrix.transformPoint(new DOMPoint(0, 0)) : new DOMPoint(size / 2, size / 2);
}

/* ------------------------------------------------------------------ */
/* Contextual controls                                                 */
/* ------------------------------------------------------------------ */

function Control({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[4.25rem_1fr_3rem] items-center gap-3">
      <span id={id} className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-paper/55">
        {label}
      </span>
      <SliderPrimitive.Root
        aria-labelledby={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        className="relative flex h-11 touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-px grow bg-paper/18">
          <SliderPrimitive.Range className="absolute h-full bg-teal" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-valuetext={format(value)}
          className="block size-3.5 rounded-full bg-paper shadow-[0_0_0_4px_rgba(0,240,230,0.18)] outline-none transition-shadow hover:shadow-[0_0_0_6px_rgba(0,240,230,0.24)] focus-visible:shadow-[0_0_0_3px_var(--cpu-teal)]"
        />
      </SliderPrimitive.Root>
      <output className="tabular text-right font-mono text-[0.6875rem] text-mint/80">{format(value)}</output>
    </div>
  );
}

function Nudge({ onNudge }: { onNudge: (dx: number, dy: number) => void }) {
  const button = "grid size-11 place-items-center rounded-sm text-paper/60 transition-colors hover:bg-mint/8 hover:text-paper";
  return (
    <div className="grid grid-cols-[4.25rem_1fr] items-center gap-3">
      <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-paper/55">Position</span>
      <div className="flex items-center gap-1" role="group" aria-label="Nudge position">
        <button type="button" className={button} onClick={() => onNudge(-0.01, 0)} aria-label="Move left">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={button} onClick={() => onNudge(0, -0.01)} aria-label="Move up">
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={button} onClick={() => onNudge(0, 0.01)} aria-label="Move down">
          <ArrowDown className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={button} onClick={() => onNudge(0.01, 0)} aria-label="Move right">
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
        <span className="ml-2 text-xs text-paper/40 max-sm:hidden">or drag it</span>
      </div>
    </div>
  );
}

function PanelFoot({ onReset, children }: { onReset: () => void; children?: ReactNode }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      {children ?? <span />}
      <button
        type="button"
        onClick={onReset}
        className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-paper/60 underline-offset-4 transition-colors hover:text-paper hover:underline"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Reset
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

type Drag = {
  pointer: number;
  target: LayerId;
  mode: "move" | "handle";
  startX: number;
  startY: number;
  pivotX: number;
  pivotY: number;
  startDist: number;
  startAngle: number;
  base: Transform;
};

type Pinch = { target: LayerId; dist: number; angle: number; mid: { x: number; y: number }; base: Transform };

export function Engine() {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const [state, setState] = useState<PfpState>(() => freshState());
  const [kit, setKit] = useState<Kit | null>(null);
  const [bodies, setBodies] = useState<Bodies>({});
  const [kitError, setKitError] = useState(false);
  /** The section is close enough that the kit is loading (the skeleton only shimmers from then on). */
  const [near, setNear] = useState(false);
  const [image, setImage] = useState<UserImage | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hover, setHover] = useState(false);
  const [cssSize, setCssSize] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  const bodiesRef = useRef(bodies);
  useLayoutEffect(() => {
    bodiesRef.current = bodies;
  }, [bodies]);
  const bodyLoads = useRef(new Map<BodyAngle, Promise<void>>());
  const dragRef = useRef<Drag | null>(null);
  const pinchRef = useRef<Pinch | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /** Touch: whether the current gesture edits (true) or may scroll the page (false). */
  const touchClaim = useRef(false);
  /** Touch on the unselected PFP: a tap without travel selects it. */
  const tapRef = useRef<{ id: number; x: number; y: number } | null>(null);
  /** Last edit time; the selected PFP answers touch drags for PFP_TOUCH_MS after it. */
  const lastEdit = useRef(0);
  const pending = useRef<{ id: LayerId; t: Transform } | null>(null);
  const frame = useRef(0);
  /** Entrance: 0 → 1 as the kit assembles in the empty stage. */
  const assemble = useRef(reduced ? 1 : 0);

  /** Load one armor angle once; resolves when it can be drawn. */
  const ensureBody = useCallback((angle: BodyAngle) => {
    let job = bodyLoads.current.get(angle);
    if (!job) {
      job = loadBody(angle).then((loaded) => setBodies((prev) => ({ ...prev, [angle]: loaded })));
      job.catch(() => bodyLoads.current.delete(angle));
      bodyLoads.current.set(angle, job);
    }
    return job;
  }, []);

  // Load the kit (glasses + front armor) only when the section approaches the viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let alive = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        setNear(true);
        Promise.all([loadKit(), ensureBody(DEFAULTS.angle)])
          .then(([k]) => alive && setKit(k))
          .catch(() => alive && setKitError(true));
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [ensureBody]);

  // Once someone is wearing it, fetch the other armor angles in the background.
  useEffect(() => {
    if (!image || !kit) return;
    let cancelled = false;
    (async () => {
      for (const angle of BODY_ANGLES) {
        if (cancelled) return;
        await ensureBody(angle).catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [image, kit, ensureBody]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || !kit) return;
    const css = stage.clientWidth;
    const px = Math.min(PREVIEW_MAX, Math.max(1, Math.round(css * Math.min(window.devicePixelRatio || 1, 2))));
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let s = stateRef.current;
    let bodyAlpha = 1;
    if (!image) {
      // Empty stage: the glasses float over an open face zone, the armor waits
      // below. Small stages lift them further so the upload prompt fits between.
      const compact = css < 560;
      s = {
        ...s,
        transforms: {
          ...s.transforms,
          glasses: { ...s.transforms.glasses, y: s.transforms.glasses.y - (compact ? 0.13 : 0.09), scale: compact ? 0.92 : 1.08 },
          body: { ...s.transforms.body, y: s.transforms.body.y + 0.09 },
        },
      };
      bodyAlpha = 0.5;
    }
    const a = assemble.current;
    if (a < 1) {
      // The kit drops into place: glasses from above, armor from below.
      const e = 1 - a;
      s = {
        ...s,
        transforms: {
          ...s.transforms,
          glasses: { ...s.transforms.glasses, y: s.transforms.glasses.y - 0.12 * e * e },
          body: { ...s.transforms.body, y: s.transforms.body.y + 0.14 * e * e },
        },
        glass: s.glass * a,
      };
    }
    drawPfp(ctx, px, s, kit, bodiesRef.current, image, { bodyAlpha });
    if (a < 1) {
      ctx.fillStyle = `rgba(3, 22, 19, ${(1 - a) * 0.9})`;
      ctx.fillRect(0, 0, px, px);
    }
  }, [kit, image]);

  // Repaint on any state/image/armor change, batched to one frame.
  useEffect(() => {
    const raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [paint, state, bodies]);

  // Keep the backing store matched to the displayed size.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      setCssSize(stage.clientWidth);
      requestAnimationFrame(paint);
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [paint]);

  // First view: the kit assembles once, in the empty stage.
  useEffect(() => {
    if (!kit || reduced || assemble.current >= 1) {
      assemble.current = 1;
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const proxy = { a: 0 };
    let tween: gsap.core.Tween | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        tween = gsap.to(proxy, {
          a: 1,
          duration: 1.3,
          ease: "power3.out",
          onUpdate: () => {
            assemble.current = proxy.a;
            paint();
          },
        });
      },
      { threshold: 0.35 },
    );
    io.observe(stage);
    return () => {
      io.disconnect();
      tween?.kill();
      assemble.current = 1;
    };
  }, [kit, reduced, paint]);

  // The dock arrives with the first image.
  useLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock || !image || reduced) return;
    const tween = gsap.fromTo(dock, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" });
    return () => {
      tween.kill();
    };
  }, [image, reduced]);

  const commit = useCallback((id: LayerId, t: Transform) => {
    lastEdit.current = performance.now();
    setState((prev) => ({ ...prev, transforms: { ...prev.transforms, [id]: clean(id, t) } }));
  }, []);

  const schedule = useCallback(
    (id: LayerId, t: Transform) => {
      pending.current = { id, t };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const p = pending.current;
        pending.current = null;
        if (p) commit(p.id, p.t);
      });
    },
    [commit],
  );
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const loadFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That image is over the 20 MB limit.");
      return;
    }
    setError("");
    try {
      const decoded = await decodeUpload(file);
      assemble.current = 1;
      setImage(decoded);
      setFileName(file.name);
      setEngaged(false);
      // Wear CPU straight away: glasses on, front armor on, default fit.
      setState(freshState("glasses"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That image could not be decoded.");
    }
  }, []);

  /* ------------------------------ gestures ------------------------------ */

  const toCanvas = (clientX: number, clientY: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    const size = canvasRef.current?.width || rect.width;
    return { x: ((clientX - rect.left) / rect.width) * size, y: ((clientY - rect.top) / rect.height) * size, size, rect };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-stage-ui]")) return;
    if (!image || !kit) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = stateRef.current;
    const handle = (e.target as HTMLElement).closest("[data-handle]");
    const p = toCanvas(e.clientX, e.clientY);
    const layer = handle ? s.selected : hitTest(kit, bodiesRef.current, s, p.size, image, p.x, p.y) ?? "userPfp";

    // A finger on the photo scrolls the page unless the PFP is the layer being
    // edited; a tap selects it. Glasses, armour, handle and pinches always edit.
    if (e.pointerType === "touch" && pointers.current.size === 1 && !handle && layer === "userPfp") {
      const editingPfp = s.selected === "userPfp" && performance.now() - lastEdit.current < PFP_TOUCH_MS;
      if (!editingPfp) {
        touchClaim.current = false;
        tapRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        return;
      }
    }
    touchClaim.current = true;
    tapRef.current = null;
    e.preventDefault(); // no text selection while dragging the image
    e.currentTarget.setPointerCapture(e.pointerId);
    setInteracting(true);
    setEngaged(true);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const target = dragRef.current?.target ?? s.selected;
      pinchRef.current = {
        target,
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        base: s.transforms[target],
      };
      dragRef.current = null;
      return;
    }

    if (layer !== s.selected) setState((prev) => ({ ...prev, selected: layer }));
    const pivot = pivotFor(s, layer, p.size, image);
    const k = p.rect.width / p.size;
    const pivotX = p.rect.left + pivot.x * k;
    const pivotY = p.rect.top + pivot.y * k;
    dragRef.current = {
      pointer: e.pointerId,
      target: layer,
      mode: handle ? "handle" : "move",
      startX: e.clientX,
      startY: e.clientY,
      pivotX,
      pivotY,
      startDist: Math.max(1, Math.hypot(e.clientX - pivotX, e.clientY - pivotY)),
      startAngle: Math.atan2(e.clientY - pivotY, e.clientX - pivotX),
      base: s.transforms[layer],
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const width = stageRef.current!.clientWidth;
    const pinch = pinchRef.current;
    if (pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      schedule(pinch.target, {
        x: pinch.base.x + (mid.x - pinch.mid.x) / width,
        y: pinch.base.y + (mid.y - pinch.mid.y) / width,
        scale: pinch.base.scale * (Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)) / pinch.dist),
        rotation: pinch.base.rotation + deg(Math.atan2(b.y - a.y, b.x - a.x) - pinch.angle),
      });
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointer !== e.pointerId) return;
    if (drag.mode === "move") {
      schedule(drag.target, { ...drag.base, x: drag.base.x + (e.clientX - drag.startX) / width, y: drag.base.y + (e.clientY - drag.startY) / width });
    } else {
      const dist = Math.max(1, Math.hypot(e.clientX - drag.pivotX, e.clientY - drag.pivotY));
      let rotation = drag.base.rotation + deg(Math.atan2(e.clientY - drag.pivotY, e.clientX - drag.pivotX) - drag.startAngle);
      if (Math.abs(rotation) < 3) rotation = 0; // snap level
      schedule(drag.target, { ...drag.base, scale: drag.base.scale * (dist / drag.startDist), rotation });
    }
  };

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    const tap = tapRef.current;
    if (tap?.id === e.pointerId) {
      tapRef.current = null;
      if (e.type === "pointerup" && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10) {
        lastEdit.current = performance.now();
        setEngaged(true);
        setState((prev) => ({ ...prev, selected: "userPfp" }));
      }
    }
    if (dragRef.current?.pointer === e.pointerId) dragRef.current = null;
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) setInteracting(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Trackpad pinch / ctrl+wheel zooms the selected layer; plain wheel scrolls the page.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || !image) return;
      e.preventDefault();
      const s = stateRef.current;
      const t = s.transforms[s.selected];
      commit(s.selected, { ...t, scale: t.scale * Math.exp(-e.deltaY * 0.01) });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [image, commit]);

  // Touch: pointerdown (which fires first) decides whether this gesture edits;
  // touch-action can't express "scroll unless the finger is on the glasses", so
  // an editing touch cancels the browser's pan here instead.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !image) return;
    const onStart = (e: TouchEvent) => {
      if (touchClaim.current || e.touches.length > 1) e.preventDefault();
    };
    const onMove = (e: TouchEvent) => {
      if (touchClaim.current && e.cancelable) e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) touchClaim.current = false;
    };
    stage.addEventListener("touchstart", onStart, { passive: false });
    stage.addEventListener("touchmove", onMove, { passive: false });
    stage.addEventListener("touchend", onEnd);
    stage.addEventListener("touchcancel", onEnd);
    return () => {
      stage.removeEventListener("touchstart", onStart);
      stage.removeEventListener("touchmove", onMove);
      stage.removeEventListener("touchend", onEnd);
      stage.removeEventListener("touchcancel", onEnd);
    };
  }, [image]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!image) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inputRef.current?.click();
      }
      return;
    }
    const s = stateRef.current;
    const t = s.transforms[s.selected];
    const step = e.shiftKey ? 0.05 : 0.01;
    const changes: Record<string, Partial<Transform>> = {
      ArrowLeft: { x: t.x - step },
      ArrowRight: { x: t.x + step },
      ArrowUp: { y: t.y - step },
      ArrowDown: { y: t.y + step },
      "+": { scale: t.scale * 1.04 },
      "=": { scale: t.scale * 1.04 },
      "-": { scale: t.scale / 1.04 },
      "[": { rotation: t.rotation - 2 },
      "]": { rotation: t.rotation + 2 },
    };
    const change = changes[e.key];
    if (!change) return;
    e.preventDefault();
    setEngaged(true);
    commit(s.selected, { ...t, ...change });
  };

  /* ------------------------------- export ------------------------------- */

  const exportPng = async () => {
    if (!kit || !image) return;
    setExporting(true);
    try {
      await ensureBody(stateRef.current.angle);
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable.");
      drawPfp(ctx, EXPORT_SIZE, stateRef.current, kit, bodiesRef.current, image);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Export failed.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cpu-${fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-") || "pfp"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  /* ------------------------------ controls ------------------------------ */

  const edit = (layer: LayerId, change: Partial<Transform>) => {
    setEngaged(true);
    commit(layer, { ...stateRef.current.transforms[layer], ...change });
  };
  const nudge = (layer: LayerId) => (dx: number, dy: number) => {
    setEngaged(true);
    setState((prev) => {
      const t = prev.transforms[layer];
      return { ...prev, transforms: { ...prev.transforms, [layer]: clean(layer, { ...t, x: t.x + dx, y: t.y + dy }) } };
    });
  };
  const reset = (layer: LayerId) => setState((prev) => resetLayer(prev, layer));
  const chooseAngle = (angle: BodyAngle) => {
    setEngaged(true);
    void ensureBody(angle)
      .then(() => setState((prev) => ({ ...prev, angle, bodyOn: true, selected: "body" })))
      .catch(() => setError("That armor angle could not load. Try again."));
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const degf = (v: number) => `${Math.round(v)}°`;
  const signed = (v: number) => `${v > 0.004 ? "+" : ""}${Math.round(v * 100)}`;
  const tf = state.transforms;

  const items: ToolbarItem[] = [
    {
      id: "userPfp",
      label: "PFP",
      icon: <ScanFace />,
      content: (
        <div className="flex flex-col gap-1">
          <Control label="Scale" value={tf.userPfp.scale} min={0.4} max={4} step={0.01} format={pct} onChange={(v) => edit("userPfp", { scale: v })} />
          <Nudge onNudge={nudge("userPfp")} />
          <PanelFoot onReset={() => reset("userPfp")} />
        </div>
      ),
    },
    {
      id: "glasses",
      label: "Glasses",
      icon: <Glasses />,
      content: (
        <div className="flex flex-col gap-1">
          <Control label="Scale" value={tf.glasses.scale} min={0.35} max={2.6} step={0.01} format={pct} onChange={(v) => edit("glasses", { scale: v })} />
          <Control label="Rotate" value={tf.glasses.rotation} min={-45} max={45} step={1} format={degf} onChange={(v) => edit("glasses", { rotation: v })} />
          <Control label="Glass" value={state.glass} min={0.35} max={1} step={0.01} format={pct} onChange={(v) => setState((prev) => ({ ...prev, glass: v }))} />
          <PanelFoot onReset={() => reset("glasses")} />
        </div>
      ),
    },
    {
      id: "body",
      label: "Body",
      icon: <Shirt />,
      content: (
        <div className="flex flex-col gap-2">
          <SegmentedControl
            label="Armor angle"
            value={state.angle}
            onValueChange={(v) => chooseAngle(v as BodyAngle)}
            className={cn(!state.bodyOn && "opacity-60")}
            options={BODY_ANGLES.map((angle) => ({
              value: angle,
              label: BODIES[angle].label,
              media: (
                <Image
                  src={BODIES[angle].thumb}
                  alt=""
                  width={240}
                  height={180}
                  sizes="80px"
                  className="pointer-events-none aspect-4/3 w-full max-w-18 object-contain"
                />
              ),
            }))}
          />
          {/* Height first-class: raising or lowering the suit is the fit that matters most. */}
          <div className="flex flex-col gap-1">
            <Control label="Scale" value={tf.body.scale} min={LIMITS.body.scale[0]} max={LIMITS.body.scale[1]} step={0.01} format={pct} onChange={(v) => edit("body", { scale: v })} />
            <Control label="Height" value={-tf.body.y} min={-0.6} max={0.6} step={0.005} format={signed} onChange={(v) => edit("body", { y: -v })} />
            <Control label="Shift" value={tf.body.x} min={-0.6} max={0.6} step={0.005} format={signed} onChange={(v) => edit("body", { x: v })} />
          </div>
          <PanelFoot onReset={() => reset("body")}>
            <button
              type="button"
              aria-pressed={state.bodyOn}
              onClick={() => setState((prev) => ({ ...prev, bodyOn: !prev.bodyOn }))}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 text-xs font-medium transition-colors",
                state.bodyOn ? "text-mint" : "text-paper/55 hover:text-paper",
              )}
            >
              {state.bodyOn ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}
              {state.bodyOn ? "Armor on" : "Armor off"}
            </button>
          </PanelFoot>
        </div>
      ),
    },
  ];

  // Layer geometry is linear in stage size, so measure straight in CSS px.
  const frameCss = useMemo(() => (image && cssSize ? frameFor(state, cssSize, image) : null), [state, image, cssSize]);
  // The resize handle sits on the corner that stays on the stage (the armor runs off the bottom).
  const handleCss = useMemo(() => {
    if (!frameCss) return null;
    const p = frameCss[state.selected === "body" ? 1 : 2];
    const clampTo = (v: number) => Math.min(cssSize - 16, Math.max(16, v));
    return { x: clampTo(p.x), y: clampTo(p.y) };
  }, [frameCss, state.selected, cssSize]);

  const showFrame = !!frameCss && (hover || interacting || panelOpen);
  const layerName = { userPfp: "PFP", glasses: "Glasses", body: "Body" }[state.selected];

  return (
    <section
      ref={sectionRef}
      id="engine"
      tabIndex={-1}
      aria-labelledby="engine-title"
      className="relative px-(--gutter) pb-[clamp(4rem,8vw,7rem)] pt-[clamp(3rem,6vw,5rem)]"
    >
      <div className="grid items-center gap-x-[clamp(2rem,5vw,6rem)] gap-y-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div className="flex flex-col gap-8 lg:self-center">
          <h2
            id="engine-title"
            className="text-[clamp(2.75rem,6.4vw,6.25rem)] font-semibold leading-[0.9] tracking-[-0.04em] text-paper [font-variation-settings:'wdth'_112,'opsz'_144]"
          >
            Put on
            <br />
            the <span className="text-mint">glass.</span>
          </h2>
          {/* Desktop only: stacked above the stage it would push the editor below the fold. */}
          <figure className="relative aspect-square w-full max-w-72 overflow-hidden rounded-md border border-mint/10 bg-ink-1/60 max-lg:hidden">
            <Image
              src="/art/campaign/square/22-cpu-glass-object.webp"
              alt="CPU's curved dark optical visor floating in a black product studio"
              fill
              loading="lazy"
              sizes="288px"
              className="object-cover"
            />
          </figure>
          <ol className="flex flex-col gap-3 text-[0.95rem] text-paper/70 max-lg:hidden">
            {[
              ["01", "Upload your PFP"],
              ["02", "Wear CPU: glasses and armor"],
              ["03", "Adjust the fit"],
              ["04", `Export a ${EXPORT_SIZE} px PNG`],
            ].map(([n, t]) => (
              <li key={n} className="flex items-baseline gap-4">
                <span className="font-mono text-[0.6875rem] text-mint/70">{n}</span>
                {t}
              </li>
            ))}
          </ol>
          <p className="text-xs text-paper/45 max-lg:hidden">Your image never leaves this browser.</p>
        </div>

        <div className="relative mx-auto w-full max-w-[min(100%,calc(100svh_-_12rem),48rem)]">
          <div
            ref={stageRef}
            role="application"
            aria-roledescription="PFP editor"
            aria-label={
              image
                ? `CPU PFP editor, ${layerName} selected. Drag the image to move what you touch; arrows move, plus and minus scale, brackets rotate.`
                : "Upload your PFP. Press Enter to choose an image, or drop one here."
            }
            tabIndex={0}
            onPointerDown={onPointerDown}
            onClick={() => !image && inputRef.current?.click()}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
            onKeyDown={onKeyDown}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setDragOver(false);
              void loadFile(e.dataTransfer.files[0]);
            }}
            onPaste={(e) => {
              const file = [...e.clipboardData.files].find((f) => ACCEPTED_TYPES.includes(f.type));
              if (file) {
                e.preventDefault();
                void loadFile(file);
              }
            }}
            className={cn(
              "group relative aspect-square w-full select-none overflow-hidden rounded-md bg-ink-1 outline-none transition-shadow duration-500 focus-visible:shadow-[0_0_0_2px_var(--cpu-teal)]",
              "shadow-[0_40px_120px_-40px_rgba(0,240,230,0.28),0_0_0_1px_rgba(151,252,228,0.08)]",
              image ? (interacting ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer",
              dragOver && "shadow-[0_0_0_2px_var(--cpu-teal),0_40px_140px_-30px_rgba(0,240,230,0.55)]",
            )}
            // Vertical swipes scroll the page; a touch claims the gesture only where
            // there is something to move (see the touch effect above).
            style={{ touchAction: "pan-y" }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
            {near && !kit && !kitError && <div className="skeleton absolute inset-0" aria-hidden="true" />}

            {showFrame && frameCss && handleCss && (
              <>
                <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                  <polygon
                    points={frameCss.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="rgba(151,252,228,0.55)"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                  />
                </svg>
                <span
                  data-handle
                  aria-hidden="true"
                  className="absolute z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize place-items-center"
                  style={{ left: handleCss.x, top: handleCss.y }}
                >
                  <span className="size-3.5 rounded-full border-2 border-teal bg-ink-1 shadow-[0_0_14px_var(--cpu-teal)]" />
                </span>
              </>
            )}

            {!image && kit && (
              <div className="pointer-events-none absolute inset-x-0 top-[59%] flex -translate-y-1/2 flex-col items-center gap-1.5 px-6 text-center sm:top-[57%] sm:gap-2.5">
                <span className="grid size-11 place-items-center sm:size-14 rounded-full bg-teal text-ink-1 shadow-[0_0_48px_-6px_var(--cpu-teal)] transition-shadow duration-300 group-hover:shadow-[0_0_64px_-2px_var(--cpu-teal)]">
                  <ImagePlus className="size-5 sm:size-6" aria-hidden="true" />
                </span>
                <span className="text-[clamp(1.25rem,2.6vw,2rem)] font-semibold tracking-[-0.02em] text-paper [text-shadow:0_2px_24px_rgba(0,0,0,0.8)]">
                  {dragOver ? "Drop to put it on" : "Upload your PFP"}
                </span>
                <span className="text-sm text-paper/70 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">PNG, JPEG or WebP</span>
                <span className="text-[0.6875rem] text-paper/40 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)] max-sm:hidden">Up to 20 MB · drop or paste works too</span>
              </div>
            )}

            {image && !engaged && (
              <p
                data-stage-ui
                className="pointer-events-none absolute left-1/2 top-3 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-sm bg-ink-1/70 px-3 py-1.5 text-center text-xs font-medium text-paper/85 backdrop-blur-md"
              >
                {fine ? "Drag the glasses onto your eyes · the corner dot resizes and turns them" : "Drag the glasses onto your eyes · pinch to resize"}
              </p>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              void loadFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {image && (
            <div className="relative z-20 mx-auto -mt-5 w-fit max-w-full">
              {/* GSAP animates this inner box; the outer one owns CSS positioning. Panels
                  open below the stage so the layer being adjusted stays in view. */}
              <div ref={dockRef}>
              <ToolbarDynamic
                label="PFP layers"
                items={items}
                active={state.selected}
                open={panelOpen}
                onSelect={(id) => {
                  lastEdit.current = performance.now();
                  setState((prev) => ({ ...prev, selected: id as LayerId }));
                }}
                onOpenChange={setPanelOpen}
                className="w-[min(100vw_-_2rem,30rem)] flex-col-reverse"
                leading={
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-sm px-2 text-paper/60 transition-colors hover:bg-mint/8 hover:text-paper"
                  >
                    <ImagePlus className="size-[1.15rem]" aria-hidden="true" />
                    <span className="text-[0.625rem] font-semibold uppercase leading-none tracking-[0.12em]">New</span>
                    <span className="sr-only">image</span>
                  </button>
                }
                trailing={
                  <button
                    type="button"
                    disabled={!kit || exporting}
                    onClick={() => void exportPng()}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xs bg-teal px-3.5 text-sm font-semibold text-ink-1 transition-[background-color,box-shadow] hover:bg-mint hover:shadow-[0_0_28px_-6px_var(--cpu-teal)] disabled:opacity-50"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    <span className="max-sm:sr-only">{exporting ? "Rendering…" : "Export"}</span>
                  </button>
                }
              />
              </div>
            </div>
          )}

          <div className="mt-4 flex min-h-5 items-center justify-between gap-4 text-xs" role="status" aria-live="polite">
            <span className="truncate text-paper/45">
              {error ? (
                <span className="text-fog">{error}</span>
              ) : kitError ? (
                <span className="text-fog">The CPU kit could not load. Refresh to try again.</span>
              ) : image ? (
                `${fileName} · stays in this browser`
              ) : (
                <span className="lg:hidden">Your image never leaves this browser.</span>
              )}
            </span>
            {image && (
              <button
                type="button"
                onClick={() => setState((prev) => freshState(prev.selected))}
                className="shrink-0 font-medium text-paper/55 underline-offset-4 transition-colors hover:text-paper hover:underline"
              >
                Reset all
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
