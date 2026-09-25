import { HYPERLIQUID_PATH, HYPERLIQUID_VIEWBOX } from "@/components/brand/marks";
import { manifest, type BackgroundLayer } from "./manifest";
import type { PfpState } from "./state";

export type AssetMap = Map<string, HTMLImageElement>;

const [VB_X, VB_Y, VB_W, VB_H] = HYPERLIQUID_VIEWBOX.split(" ").map(Number);
let markPath: Path2D | null = null;
const getMark = () => (markPath ??= new Path2D(HYPERLIQUID_PATH));

function drawBackground(ctx: CanvasRenderingContext2D, S: number, bg: BackgroundLayer, assets: AssetMap, seed: number) {
  switch (bg.kind) {
    case "solid":
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, S, S);
      return;
    case "radial": {
      const g = ctx.createRadialGradient(S * 0.5, S * 0.42, 0, S * 0.5, S * 0.5, S * 0.75);
      g.addColorStop(0, bg.inner);
      g.addColorStop(1, bg.outer);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      return;
    }
    case "halftone": {
      ctx.fillStyle = bg.ground;
      ctx.fillRect(0, 0, S, S);
      // Deterministic wave field in the banner's halftone language.
      const cell = S / 56;
      const phase = (seed % 97) / 97;
      ctx.fillStyle = bg.ink;
      for (let gy = 0; gy < 58; gy++) {
        for (let gx = 0; gx < 58; gx++) {
          const off = gy % 2 ? cell / 2 : 0;
          const px = gx * cell + off;
          const py = gy * cell;
          const u = px / S;
          const v = py / S;
          const wave = Math.sin(u * 5.2 + Math.sin(v * 3.1 + phase * 6.28) * 1.6 + phase * 6.28) * 0.5 + 0.5;
          const band = Math.pow(wave, 2.4) * (0.35 + 0.65 * Math.abs(Math.sin(v * 2.4 + u * 1.3)));
          const r = band * cell * 0.46;
          if (r < cell * 0.06) continue;
          ctx.globalAlpha = 0.35 + band * 0.65;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return;
    }
    case "image": {
      const img = assets.get(bg.src);
      if (!img) {
        ctx.fillStyle = "#031613";
        ctx.fillRect(0, 0, S, S);
        return;
      }
      const scale = Math.max(S / img.naturalWidth, S / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      // Keep the figure legible over the busy environment.
      const g = ctx.createRadialGradient(S / 2, S * 0.55, S * 0.05, S / 2, S * 0.55, S * 0.6);
      g.addColorStop(0, "rgba(2,12,10,0.72)");
      g.addColorStop(1, "rgba(2,12,10,0.05)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }
  }
}

export function characterRect(S: number, state: PfpState, img: { width: number; height: number }) {
  const base = manifest.base.find((b) => b.id === state.base)!;
  const h = S * base.frame.h * state.zoom;
  const w = h * (img.width / img.height);
  const cx = S * (base.frame.x + state.x);
  const cy = S * (base.frame.y + state.y);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/**
 * Deterministic layer order: background → back light → character →
 * shade → badges → name. Used for both the live preview and the export.
 */
export function drawPfp(ctx: CanvasRenderingContext2D, S: number, state: PfpState, assets: AssetMap, fontFamily: string) {
  ctx.save();
  ctx.clearRect(0, 0, S, S);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const bg = manifest.backgrounds.find((b) => b.id === state.background)!;
  drawBackground(ctx, S, bg, assets, state.seed);

  const base = manifest.base.find((b) => b.id === state.base)!;
  const img = assets.get(base.src);
  const glow = state.light === "glow" || state.light === "both";
  const shade = state.light === "shade" || state.light === "both";

  if (img) {
    const r = characterRect(S, state, base);
    if (glow) {
      const g = ctx.createRadialGradient(r.x + r.w / 2, S * 0.55, 0, r.x + r.w / 2, S * 0.55, S * 0.55);
      g.addColorStop(0, "rgba(0,240,230,0.28)");
      g.addColorStop(1, "rgba(0,240,230,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      ctx.shadowColor = "rgba(0,240,230,0.55)";
      ctx.shadowBlur = S * 0.035;
    }
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  if (shade) {
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.32, S / 2, S / 2, S * 0.74);
    g.addColorStop(0, "rgba(2,12,10,0)");
    g.addColorStop(1, "rgba(2,12,10,0.78)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }

  const pad = S * 0.055;
  if (state.badge === "mark" || state.badge === "both") {
    const w = S * 0.13;
    const scale = w / VB_W;
    const h = VB_H * scale;
    ctx.save();
    ctx.translate(S - pad - w, S - pad - h);
    ctx.scale(scale, scale);
    ctx.translate(-VB_X, -VB_Y);
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "#97fce4";
    ctx.fill(getMark());
    ctx.restore();
  }
  if (state.badge === "ticker" || state.badge === "both") {
    ctx.save();
    ctx.font = `900 ${Math.round(S * 0.085)}px ${fontFamily}`;
    ctx.fontVariantCaps = "normal";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = S * 0.02;
    ctx.fillStyle = "#97fce4";
    ctx.fillText("$", pad, S - pad);
    const dollar = ctx.measureText("$").width;
    ctx.fillStyle = "#fbf9fb";
    ctx.fillText("CPU", pad + dollar, S - pad);
    ctx.restore();
  }

  if (state.name) {
    ctx.save();
    ctx.font = `700 ${Math.round(S * 0.038)}px ${fontFamily}`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(251,249,251,0.92)";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = S * 0.015;
    ctx.fillText(state.name.toUpperCase(), pad, pad);
    ctx.restore();
  }

  ctx.restore();
}

export function loadAssets(srcs: string[]): Promise<{ assets: AssetMap; missing: string[] }> {
  const assets: AssetMap = new Map();
  const missing: string[] = [];
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            assets.set(src, img);
            resolve();
          };
          img.onerror = () => {
            missing.push(src);
            resolve();
          };
          img.src = src;
        }),
    ),
  ).then(() => ({ assets, missing }));
}
