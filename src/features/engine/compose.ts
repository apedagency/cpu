import { HYPERLIQUID_PATH } from "@/components/brand/marks";
import { BODIES, DEFAULTS, VISOR, VISOR_GLASS_W, VISOR_SRC, type BodyAngle, type LayerId, type VisorAsset } from "./manifest";
import type { PfpState, Transform } from "./state";

export type UserImage = HTMLCanvasElement;

interface AlphaMask {
  data: Uint8ClampedArray;
  w: number;
  h: number;
}

export interface Kit {
  visor: Record<VisorAsset, HTMLImageElement>;
  /** Glass silhouette filled with the multiply colour (built once). */
  multiply: HTMLCanvasElement;
  mask: AlphaMask;
}

export interface LoadedBody {
  image: HTMLImageElement;
  /** Inner back of turned angles, drawn under the PFP. */
  back: HTMLImageElement | null;
  mask: AlphaMask;
}

export type Bodies = Partial<Record<BodyAngle, LoadedBody>>;

/** Drawing options for the empty stage (the kit shown without a wearer). */
export interface DrawOptions {
  bodyAlpha?: number;
}

/* Official mark bounds (see HYPERLIQUID_VIEWBOX). */
const MARK = { x: 24.88, y: 44.53, w: 150.24, h: 110.95 };
let markPath: Path2D | null = null;

/* ------------------------------------------------------------------ */
/* Geometry: one matrix per layer, shared by drawing and hit-testing.  */
/* ------------------------------------------------------------------ */

const apply = (m: DOMMatrix, size: number, t: Transform) =>
  m.translate(t.x * size, t.y * size).rotate(t.rotation).scale(t.scale);

export interface LayerBox {
  matrix: DOMMatrix;
  /** Local rect drawn at (x, y, w, h) under `matrix`. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export function glassesBox(state: PfpState, size: number): LayerBox {
  const w = (DEFAULTS.glasses.glassW * size) / VISOR_GLASS_W;
  const h = w * VISOR.aspect;
  const anchor = new DOMMatrix().translate(DEFAULTS.glasses.cx * size, DEFAULTS.glasses.cy * size);
  return { matrix: apply(anchor, size, state.transforms.glasses), x: -w * VISOR.mark.cx, y: -h * VISOR.mark.cy, w, h };
}

export function bodyBox(state: PfpState, size: number, angle: BodyAngle = state.angle): LayerBox {
  const kit = BODIES[angle];
  const w = (DEFAULTS.body.moduleH * size) / kit.moduleH;
  const h = w * kit.aspect;
  const anchor = new DOMMatrix().translate(DEFAULTS.body.cx * size, DEFAULTS.body.cy * size);
  return { matrix: apply(anchor, size, state.transforms.body), x: -w * kit.anchor.cx, y: -h * kit.anchor.cy, w, h };
}

export function pfpBox(state: PfpState, size: number, image: UserImage): LayerBox {
  const fit = Math.max(size / image.width, size / image.height);
  const w = image.width * fit;
  const h = image.height * fit;
  return { matrix: apply(new DOMMatrix().translate(size / 2, size / 2), size, state.transforms.userPfp), x: -w / 2, y: -h / 2, w, h };
}

/** Where the layer's pixels are: the glass itself for the glasses, the whole frame otherwise. */
export function outlineBox(id: LayerId, state: PfpState, size: number, image: UserImage | null): LayerBox | null {
  if (id === "userPfp") return image ? pfpBox(state, size, image) : null;
  if (id === "body") return state.bodyOn ? bodyBox(state, size) : null;
  const b = glassesBox(state, size);
  const g = VISOR.glass;
  return { ...b, x: b.x + g.x0 * b.w, y: b.y + g.y0 * b.h, w: (g.x1 - g.x0) * b.w, h: (g.y1 - g.y0) * b.h };
}

function sample(mask: AlphaMask, box: LayerBox, px: number, py: number) {
  const p = box.matrix.inverse().transformPoint(new DOMPoint(px, py));
  const u = (p.x - box.x) / box.w;
  const v = (p.y - box.y) / box.h;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
  return mask.data[Math.floor(v * mask.h) * mask.w + Math.floor(u * mask.w)];
}

/** Top-most layer whose actual pixels are under (px, py) in canvas pixels. */
export function hitTest(kit: Kit, bodies: Bodies, state: PfpState, size: number, image: UserImage | null, px: number, py: number): LayerId | null {
  if (sample(kit.mask, glassesBox(state, size), px, py) > 40) return "glasses";
  const body = bodies[state.angle];
  if (state.bodyOn && body && sample(body.mask, bodyBox(state, size), px, py) > 40) return "body";
  return image ? "userPfp" : null;
}

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

function drawBackground(ctx: CanvasRenderingContext2D, size: number) {
  const g = ctx.createRadialGradient(size * 0.5, size * 0.4, 0, size * 0.5, size * 0.5, size * 0.78);
  g.addColorStop(0, "#0b4a40");
  g.addColorStop(0.56, "#031613");
  g.addColorStop(1, "#0b0f12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

function drawBox(ctx: CanvasRenderingContext2D, box: LayerBox, source: CanvasImageSource, alpha = 1) {
  ctx.save();
  ctx.setTransform(ctx.getTransform().multiply(box.matrix));
  ctx.globalAlpha = alpha;
  ctx.drawImage(source, box.x, box.y, box.w, box.h);
  ctx.restore();
}

/**
 * The glasses, as layered glass: every layer shares the frame, so the effects
 * follow the glasses without being separate editor layers.
 */
function drawGlasses(ctx: CanvasRenderingContext2D, kit: Kit, box: LayerBox, glass: number) {
  const base = ctx.getTransform();
  const v = kit.visor;
  const at = (img: CanvasImageSource, alpha = 1, op: GlobalCompositeOperation = "source-over") => {
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = op;
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
  };
  ctx.save();
  ctx.setTransform(base.multiply(box.matrix));

  // 1. Contact shadow on the wearer, then the glass: a multiply pass keeps the
  //    face's light but turns it teal, and the glass colour darkens it.
  at(v.shadow, 0.5 + 0.5 * glass);
  at(kit.multiply, Math.min(1, glass * 1.15), "multiply");
  at(v.base, glass);
  // 2. The dark frame edge, always solid.
  at(v.rim);
  // 3. Light: soft sheen, reflections, the mint rim glow, specular highlights,
  //    and the rim light spilling onto the wearer. Screen brightens whatever is
  //    underneath, so the glass stays readable on dark and light PFPs.
  at(v.softReflection, 1, "screen");
  at(v.reflection, 1, "screen");
  at(v.glow, 1, "screen");
  at(v.highlight, 1, "screen");
  at(v.rimLight, 0.55 + 0.45 * glass, "screen");
  ctx.globalCompositeOperation = "source-over";

  // 4. The exact Hyperliquid mark, lit from inside.
  markPath ??= new Path2D(HYPERLIQUID_PATH);
  const mw = VISOR.mark.w * box.w;
  const k = mw / MARK.w;
  ctx.translate(box.x + VISOR.mark.cx * box.w, box.y + VISOR.mark.cy * box.h);
  ctx.scale(k, k);
  ctx.translate(-(MARK.x + MARK.w / 2), -(MARK.y + MARK.h / 2));
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b); // device px per mark unit
  const fill = ctx.createLinearGradient(0, MARK.y, 0, MARK.y + MARK.h);
  fill.addColorStop(0, "#c9fff4");
  fill.addColorStop(0.5, "#86f8ec");
  fill.addColorStop(1, "#43e3d8");
  ctx.fillStyle = fill;
  ctx.shadowColor = "rgba(0, 240, 230, 0.9)";
  ctx.shadowBlur = 26 * px;
  ctx.globalAlpha = 0.95;
  ctx.fill(markPath);
  ctx.shadowBlur = 8 * px;
  ctx.fill(markPath);
  ctx.restore();
}

export function drawPfp(
  ctx: CanvasRenderingContext2D,
  size: number,
  state: PfpState,
  kit: Kit,
  bodies: Bodies,
  image: UserImage | null,
  options: DrawOptions = {},
) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawBackground(ctx, size);

  // background → armor inner back → PFP → armor front → glasses. The PFP is
  // never masked: its head simply sits over the open top of the frame.
  const body = state.bodyOn ? bodies[state.angle] : undefined;
  const box = body ? bodyBox(state, size) : null;
  if (body?.back && box) drawBox(ctx, box, body.back, options.bodyAlpha ?? 1);
  if (image) drawBox(ctx, pfpBox(state, size, image), image);
  if (body && box) drawBox(ctx, box, body.image, options.bodyAlpha ?? 1);
  drawGlasses(ctx, kit, glassesBox(state, size), state.glass);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function alphaMask(img: HTMLImageElement): AlphaMask {
  const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8ClampedArray(w * h);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3];
  return { data, w, h };
}

export async function loadKit(): Promise<Kit> {
  const entries = await Promise.all(
    (Object.entries(VISOR_SRC) as [VisorAsset, string][]).map(async ([key, src]) => [key, await loadImage(src)] as const),
  );
  const visor = Object.fromEntries(entries) as Record<VisorAsset, HTMLImageElement>;

  const base = visor.base;
  const multiply = document.createElement("canvas");
  multiply.width = base.naturalWidth;
  multiply.height = base.naturalHeight;
  const mctx = multiply.getContext("2d")!;
  mctx.drawImage(base, 0, 0);
  mctx.globalCompositeOperation = "source-in";
  mctx.fillStyle = VISOR.multiply;
  mctx.fillRect(0, 0, multiply.width, multiply.height);

  return { visor, multiply, mask: alphaMask(base) };
}

export async function loadBody(angle: BodyAngle): Promise<LoadedBody> {
  const kit = BODIES[angle];
  const [image, back] = await Promise.all([loadImage(kit.src), kit.back ? loadImage(kit.back) : null]);
  return { image, back, mask: alphaMask(image) };
}
