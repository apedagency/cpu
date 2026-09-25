import { KIT_LAYERS } from "./manifest";
import type { LayerTransform, PfpState } from "./state";

export type AssetMap = Map<string, HTMLImageElement>;
export type UserImage = HTMLCanvasElement;

function drawBackground(ctx: CanvasRenderingContext2D, size: number, state: PfpState) {
  if (state.background === "ink") {
    ctx.fillStyle = "#0b0f12";
    ctx.fillRect(0, 0, size, size);
    return;
  }

  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.42, 0, size * 0.5, size * 0.5, size * 0.78);
  gradient.addColorStop(0, state.background === "glass" ? "#0b4a40" : "#063128");
  gradient.addColorStop(0.58, "#031613");
  gradient.addColorStop(1, "#0b0f12");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  if (state.background === "dots") {
    const cell = size / 58;
    ctx.fillStyle = "#97fce4";
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < 60; x++) {
        const wave = Math.sin(x * 0.19 + Math.sin(y * 0.12) * 2.2) * 0.5 + 0.5;
        const radius = cell * 0.08 + cell * 0.34 * wave ** 2;
        ctx.globalAlpha = 0.12 + wave * 0.5;
        ctx.beginPath();
        ctx.arc(x * cell + (y % 2 ? cell / 2 : 0), y * cell, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function withTransform(ctx: CanvasRenderingContext2D, size: number, transform: LayerTransform, draw: () => void) {
  ctx.save();
  ctx.translate(size * (0.5 + transform.x), size * (0.5 + transform.y));
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.scale, transform.scale);
  ctx.globalAlpha = transform.opacity;
  draw();
  ctx.restore();
}

function drawUserImage(ctx: CanvasRenderingContext2D, size: number, image: UserImage, transform: LayerTransform) {
  withTransform(ctx, size, transform, () => {
    const fit = Math.max(size / image.width, size / image.height);
    const width = image.width * fit;
    const height = image.height * fit;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
  });
}

function drawKitLayer(ctx: CanvasRenderingContext2D, size: number, image: HTMLImageElement, transform: LayerTransform) {
  withTransform(ctx, size, transform, () => ctx.drawImage(image, -size / 2, -size / 2, size, size));
}

export function drawPfp(
  ctx: CanvasRenderingContext2D,
  size: number,
  state: PfpState,
  assets: AssetMap,
  userImage: UserImage | null,
) {
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  drawBackground(ctx, size, state);

  if (userImage) {
    drawUserImage(ctx, size, userImage, state.transforms.userPfp);
  } else {
    const placeholder = ctx.createRadialGradient(size / 2, size * 0.43, 0, size / 2, size * 0.5, size * 0.55);
    placeholder.addColorStop(0, "rgba(151,252,228,.12)");
    placeholder.addColorStop(1, "rgba(151,252,228,0)");
    ctx.fillStyle = placeholder;
    ctx.fillRect(0, 0, size, size);
  }

  if (state.effect === "glow") {
    const glow = ctx.createRadialGradient(size / 2, size * 0.48, 0, size / 2, size * 0.48, size * 0.62);
    glow.addColorStop(0, "rgba(0,240,230,.16)");
    glow.addColorStop(1, "rgba(0,240,230,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  }

  for (const id of ["body", "helmet", "visor"] as const) {
    const layer = KIT_LAYERS.find((item) => item.id === id);
    const image = layer ? assets.get(layer.src) : null;
    if (image) drawKitLayer(ctx, size, image, state.transforms[id]);
  }

  const reflection = KIT_LAYERS.find((item) => item.id === "reflection");
  const reflectionImage = reflection ? assets.get(reflection.src) : null;
  if (reflectionImage) {
    const visor = state.transforms.visor;
    drawKitLayer(ctx, size, reflectionImage, { ...visor, opacity: visor.opacity * 0.82 });
  }

  if (state.effect === "shade") {
    const shade = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.74);
    shade.addColorStop(0, "rgba(2,12,10,0)");
    shade.addColorStop(1, "rgba(2,12,10,.78)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size, size);
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
          const image = new Image();
          image.decoding = "async";
          image.onload = () => {
            assets.set(src, image);
            resolve();
          };
          image.onerror = () => {
            missing.push(src);
            resolve();
          };
          image.src = src;
        }),
    ),
  ).then(() => ({ assets, missing }));
}
