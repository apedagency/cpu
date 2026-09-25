/**
 * PFP layer manifest. Every image layer points at a real CPU asset in
 * /public/pfp. Add new art by dropping files into the matching folder and
 * registering them here — see README "PFP layers". Categories with no
 * entries (accessories today) are hidden in the UI rather than faked.
 */

export interface ImageLayer {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
}

export interface BaseLayer extends ImageLayer {
  /**
   * Default framing on a unit square: `h` is the drawn image height as a
   * multiple of the canvas; `x`/`y` place the image centre.
   */
  frame: { h: number; x: number; y: number };
}

export type BackgroundLayer =
  | { id: string; label: string; kind: "solid"; color: string; swatch: string }
  | { id: string; label: string; kind: "radial"; inner: string; outer: string; swatch: string }
  | { id: string; label: string; kind: "halftone"; ground: string; ink: string; swatch: string }
  | ({ kind: "image"; swatch: string } & ImageLayer);

export const LIGHTS = [
  { id: "flat", label: "Flat" },
  { id: "glow", label: "Glow" },
  { id: "shade", label: "Shade" },
  { id: "both", label: "Both" },
] as const;

export const BADGES = [
  { id: "none", label: "None" },
  { id: "mark", label: "Mark" },
  { id: "ticker", label: "$CPU" },
  { id: "both", label: "Both" },
] as const;

export type LightId = (typeof LIGHTS)[number]["id"];
export type BadgeId = (typeof BADGES)[number]["id"];

export const manifest = {
  base: [
    {
      id: "bust",
      label: "Bust",
      src: "/pfp/base/bust.webp",
      width: 2313,
      height: 2400,
      frame: { h: 1.02, x: 0.5, y: 0.56 },
    },
    {
      id: "hero",
      label: "Hero",
      src: "/pfp/base/hero.webp",
      width: 1908,
      height: 2400,
      frame: { h: 2.35, x: 0.53, y: 1.17 },
    },
    {
      id: "stance",
      label: "Stance",
      src: "/pfp/base/stance.webp",
      width: 1522,
      height: 2128,
      frame: { h: 2.3, x: 0.52, y: 1.12 },
    },
  ] satisfies BaseLayer[],

  backgrounds: [
    { id: "ink", label: "Ink", kind: "solid", color: "#0b0f12", swatch: "#0b0f12" },
    { id: "visor", label: "Visor", kind: "radial", inner: "#0b4a40", outer: "#031613", swatch: "radial-gradient(circle,#0b4a40,#031613)" },
    { id: "dots", label: "Dots", kind: "halftone", ground: "#031613", ink: "#97fce4", swatch: "radial-gradient(#97fce4 1px, #031613 1.5px) 0 0/4px 4px" },
    {
      id: "waves",
      label: "Waves",
      kind: "image",
      src: "/pfp/backgrounds/env-left.webp",
      width: 2048,
      height: 2048,
      swatch: "url(/pfp/backgrounds/env-left.webp) center/cover",
    },
    {
      id: "coins",
      label: "Coins",
      kind: "image",
      src: "/pfp/backgrounds/env-right.webp",
      width: 2048,
      height: 2048,
      swatch: "url(/pfp/backgrounds/env-right.webp) center/cover",
    },
  ] satisfies BackgroundLayer[],

  /** No accessory art exists yet — /public/pfp/accessories is ready for it. */
  accessories: [] as ImageLayer[],
} as const;

export type BaseId = (typeof manifest.base)[number]["id"];
export type BackgroundId = (typeof manifest.backgrounds)[number]["id"];

export const EXPORT_SIZE = 2048;
