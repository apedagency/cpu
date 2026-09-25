/**
 * The CPU wearable kit: glasses + armor, generated with Higgsfield from the
 * official character references and processed into transparent layers (see
 * docs/pfp-kit-architecture.md and public/pfp-kit/source/manifest.json).
 * There is no head piece — the wearer keeps their own head.
 *
 * Stage coordinates are fractions of the square canvas (0..1).
 */

export type LayerId = "userPfp" | "glasses" | "body";
export type KitLayerId = Exclude<LayerId, "userPfp">;
export type BodyAngle = "front" | "right-34" | "left-34" | "right" | "left";

/** Every glasses layer shares one 3042 × 1817 frame (glass + effect margin). */
export const VISOR_SRC = {
  shadow: "/pfp-kit/effects/visor-shadow.webp",
  base: "/pfp-kit/visor/visor-glass-base.webp",
  rim: "/pfp-kit/visor/visor-rim.webp",
  softReflection: "/pfp-kit/effects/glass-reflection-soft.webp",
  reflection: "/pfp-kit/visor/visor-reflection.webp",
  glow: "/pfp-kit/visor/visor-glow-mask.webp",
  highlight: "/pfp-kit/visor/visor-highlight.webp",
  rimLight: "/pfp-kit/effects/mint-rim-light.webp",
} as const;

export type VisorAsset = keyof typeof VISOR_SRC;

export const VISOR = {
  aspect: 1817 / 3042,
  /** The glass itself, in frame fractions. */
  glass: { x0: 236 / 3042, x1: 2811 / 3042, y0: 368 / 1817, y1: 1384 / 1817 },
  /** Official Hyperliquid mark: centre and width in frame fractions. The glasses pivot on its centre (the eye line). */
  mark: { cx: 0.5008, cy: 0.4283, w: 0.2709 },
  /** Multiply pass that turns whatever is behind the glass green. */
  multiply: "rgb(40 150 136)",
};

export const VISOR_GLASS_W = VISOR.glass.x1 - VISOR.glass.x0;

export interface BodyKit {
  label: string;
  src: string;
  thumb: string;
  aspect: number;
  /** Centre of the collar's front lip, in body fractions: the anchor. */
  collar: { cx: number; cy: number };
  /** Collar ring width / body width. The ring is a horizontal circle, so its width survives rotation: it is the shared scale. */
  ringW: number;
}

const body = (angle: BodyAngle, label: string, w: number, h: number, cx: number, cy: number, ringW: number): BodyKit => ({
  label,
  src: `/pfp-kit/body/body-${angle}.webp`,
  thumb: `/pfp-kit/previews/body-${angle}.webp`,
  aspect: h / w,
  collar: { cx, cy },
  ringW,
});

export const BODY_ANGLES: BodyAngle[] = ["left", "left-34", "front", "right-34", "right"];

export const BODIES: Record<BodyAngle, BodyKit> = {
  front: body("front", "Front", 2048, 1302, 0.5, 0.0939, 0.2779),
  "right-34": body("right-34", "Right ¾", 2048, 1479, 0.5451, 0.1005, 0.314),
  "left-34": body("left-34", "Left ¾", 2048, 1477, 0.4512, 0.0999, 0.3028),
  right: body("right", "Right", 2048, 1775, 0.6189, 0.1107, 0.3325),
  left: body("left", "Left", 2048, 1779, 0.3741, 0.0975, 0.3367),
};

/**
 * Default fit for a typical centred portrait: glasses across the eyes at ~40%
 * height, the collar lip at the base of the neck, the chest mark in frame.
 */
export const DEFAULTS = {
  glasses: { cx: 0.5, cy: 0.405, glassW: 0.46 },
  body: { cx: 0.5, cy: 0.75, ringW: 0.3 },
  glass: 0.74,
  angle: "front" as BodyAngle,
};

export const EXPORT_SIZE = 2048;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
