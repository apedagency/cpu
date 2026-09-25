import { HYPERLIQUID_PATH } from "@/components/brand/marks";
import { BODY, CROWN, DEFAULTS, KIT_SRC, VISOR, type KitAsset, type KitLayerId, type LayerId } from "./manifest";
import type { PfpState, Transform } from "./state";

export type UserImage = HTMLCanvasElement;

interface AlphaMask {
  data: Uint8ClampedArray;
  w: number;
  h: number;
}

export interface Kit {
  images: Record<KitAsset, HTMLImageElement>;
  /** Visor silhouette filled with the multiply colour (built once). */
  multiply: HTMLCanvasElement;
  masks: Record<KitLayerId, AlphaMask>;
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

export function layerBoxes(state: PfpState, size: number, image: UserImage | null): Record<LayerId, LayerBox | null> {
  const t = state.transforms;
  const head = apply(new DOMMatrix().translate(DEFAULTS.head.cx * size, DEFAULTS.head.cy * size), size, t.head);

  const glassW = DEFAULTS.head.glassW * size;
  const vw = glassW / VISOR.glass;
  const vh = vw * VISOR.aspect;
  const visor: LayerBox = { matrix: apply(head, size, t.visor), x: -vw / 2, y: -vh / 2, w: vw, h: vh };

  const cw = glassW * CROWN.perGlass;
  const ch = cw * CROWN.aspect;
  const helmet: LayerBox = { matrix: apply(head, size, t.helmet), x: -cw * CROWN.glassCx, y: -ch * CROWN.glassCy, w: cw, h: ch };

  const bw = DEFAULTS.body.w * size;
  const bh = bw * BODY.aspect;
  const bcx = (0.5 + (0.5 - BODY.neckCx) * DEFAULTS.body.w) * size;
  const bcy = DEFAULTS.body.top * size + bh / 2;
  const body: LayerBox = { matrix: apply(new DOMMatrix().translate(bcx, bcy), size, t.body), x: -bw / 2, y: -bh / 2, w: bw, h: bh };

  let userPfp: LayerBox | null = null;
  if (image) {
    const fit = Math.max(size / image.width, size / image.height);
    const iw = image.width * fit;
    const ih = image.height * fit;
    userPfp = { matrix: apply(new DOMMatrix().translate(size / 2, size / 2), size, t.userPfp), x: -iw / 2, y: -ih / 2, w: iw, h: ih };
  }
  return { userPfp, visor, helmet, body };
}

/** Top-most layer whose actual pixels are under (px, py) in canvas pixels. */
export function hitTest(kit: Kit, state: PfpState, size: number, image: UserImage | null, px: number, py: number): LayerId | null {
  const boxes = layerBoxes(state, size, image);
  for (const id of ["visor", "helmet", "body"] as const) {
    const box = boxes[id]!;
    const p = box.matrix.inverse().transformPoint(new DOMPoint(px, py));
    const u = (p.x - box.x) / box.w;
    const v = (p.y - box.y) / box.h;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
    const mask = kit.masks[id];
    if (mask.data[Math.floor(v * mask.h) * mask.w + Math.floor(u * mask.w)] > 40) return id;
  }
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

function drawBox(ctx: CanvasRenderingContext2D, box: LayerBox, source: CanvasImageSource) {
  ctx.save();
  ctx.setTransform(ctx.getTransform().multiply(box.matrix));
  ctx.drawImage(source, box.x, box.y, box.w, box.h);
  ctx.restore();
}

function drawVisor(ctx: CanvasRenderingContext2D, kit: Kit, box: LayerBox, glass: number) {
  const base = ctx.getTransform();
  ctx.save();
  ctx.setTransform(base.multiply(box.matrix));

  // 1. Green glass: a multiply pass keeps the face's light but turns it teal,
  //    then the art's own base colour darkens it by the Glass amount.
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = Math.min(1, glass * 1.15);
  ctx.drawImage(kit.multiply, box.x, box.y, box.w, box.h);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = glass;
  ctx.drawImage(kit.images.visorTint, box.x, box.y, box.w, box.h);

  // 2. The art's dark outline, always solid.
  ctx.globalAlpha = 1;
  ctx.drawImage(kit.images.visorEdge, box.x, box.y, box.w, box.h);

  // 3. The art's rim light and gloss, added on top of whatever is underneath.
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(kit.images.visorLight, box.x, box.y, box.w, box.h);
  ctx.globalCompositeOperation = "source-over";

  // 4. The exact Hyperliquid mark, lit from inside.
  markPath ??= new Path2D(HYPERLIQUID_PATH);
  const mw = VISOR.mark.w * box.w;
  const k = mw / MARK.w;
  const mcx = box.x + VISOR.mark.cx * box.w;
  const mcy = box.y + VISOR.mark.cy * box.h;
  ctx.translate(mcx, mcy);
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

export function drawPfp(ctx: CanvasRenderingContext2D, size: number, state: PfpState, kit: Kit, image: UserImage | null) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawBackground(ctx, size);

  const boxes = layerBoxes(state, size, image);
  if (image && boxes.userPfp) drawBox(ctx, boxes.userPfp, image);
  drawBox(ctx, boxes.body!, kit.images.body);
  drawBox(ctx, boxes.helmet!, kit.images.crown);
  drawVisor(ctx, kit, boxes.visor!, state.glass);
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
    (Object.entries(KIT_SRC) as [KitAsset, string][]).map(async ([key, src]) => [key, await loadImage(src)] as const),
  );
  const images = Object.fromEntries(entries) as Record<KitAsset, HTMLImageElement>;

  const tint = images.visorTint;
  const multiply = document.createElement("canvas");
  multiply.width = tint.naturalWidth;
  multiply.height = tint.naturalHeight;
  const mctx = multiply.getContext("2d")!;
  mctx.drawImage(tint, 0, 0);
  mctx.globalCompositeOperation = "source-in";
  mctx.fillStyle = VISOR.multiply;
  mctx.fillRect(0, 0, multiply.width, multiply.height);

  return {
    images,
    multiply,
    masks: { visor: alphaMask(tint), helmet: alphaMask(images.crown), body: alphaMask(images.body) },
  };
}
