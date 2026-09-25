export type LayerId = "userPfp" | "body" | "helmet" | "visor";
export type BackgroundId = "ink" | "dots" | "glass";
export type EffectId = "none" | "glow" | "shade";

export interface KitLayer {
  id: Exclude<LayerId, "userPfp"> | "reflection";
  label: string;
  src: string;
  bounds: { cx: number; cy: number; w: number; h: number };
}

export const KIT_LAYERS: KitLayer[] = [
  {
    id: "body",
    label: "Body",
    src: "/pfp-kit/body/body-kit.svg",
    bounds: { cx: 0.5, cy: 0.78, w: 0.76, h: 0.48 },
  },
  {
    id: "helmet",
    label: "Helmet",
    src: "/pfp-kit/helmet/helmet-shell.svg",
    bounds: { cx: 0.5, cy: 0.42, w: 0.72, h: 0.55 },
  },
  {
    id: "visor",
    label: "Visor",
    src: "/pfp-kit/visor/visor-glass.svg",
    bounds: { cx: 0.5, cy: 0.42, w: 0.72, h: 0.28 },
  },
  {
    id: "reflection",
    label: "Reflection",
    src: "/pfp-kit/effects/front-reflection.svg",
    bounds: { cx: 0.5, cy: 0.42, w: 0.62, h: 0.24 },
  },
];

export const BACKGROUNDS: { id: BackgroundId; label: string; swatch: string }[] = [
  { id: "ink", label: "Ink", swatch: "#0b0f12" },
  { id: "dots", label: "Dots", swatch: "radial-gradient(#97fce4 1px,#031613 1.5px) 0 0/5px 5px" },
  { id: "glass", label: "Glass", swatch: "radial-gradient(circle,#0b4a40,#031613)" },
];

export const EFFECTS: { id: EffectId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "glow", label: "Glow" },
  { id: "shade", label: "Shade" },
];

export const ASSET_SRCS = KIT_LAYERS.map((layer) => layer.src);
export const EXPORT_SIZE = 2048;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
