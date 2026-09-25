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

/**
 * The body is a universal lower frame, not a fitted torso: broad shoulders and
 * a low chest with a wide open top, so any head (human, anime, animal, meme)
 * sits over it without a neck socket. It draws over the PFP; turned angles
 * also carry the armor's inner back, which draws under the PFP.
 */
export interface BodyKit {
  label: string;
  /** Front layer, drawn over the PFP. */
  src: string;
  /** Inner back seen through the open top of turned angles, drawn under the PFP. */
  back?: string;
  thumb: string;
  aspect: number;
  /** Lowest point of the open top (where a chin sits), in body fractions: the anchor. */
  anchor: { cx: number; cy: number };
  /** Chest-module height / body width. Turning about the vertical axis keeps heights, so this is the shared scale. */
  moduleH: number;
}

const body = (angle: BodyAngle, label: string, w: number, h: number, cx: number, cy: number, moduleH: number, back = false): BodyKit => ({
  label,
  src: `/pfp-kit/body/body-${angle}.webp`,
  back: back ? `/pfp-kit/body/body-${angle}-back.webp` : undefined,
  thumb: `/pfp-kit/previews/body-${angle}.webp`,
  aspect: h / w,
  anchor: { cx, cy },
  moduleH,
});

export const BODY_ANGLES: BodyAngle[] = ["left", "left-34", "front", "right-34", "right"];

export const BODIES: Record<BodyAngle, BodyKit> = {
  front: body("front", "Front", 2048, 971, 0.5009, 0.4145, 0.03431),
  "right-34": body("right-34", "Right ¾", 2048, 1014, 0.568, 0.4188, 0.03474),
  "left-34": body("left-34", "Left ¾", 2048, 1022, 0.4868, 0.3684, 0.03297),
  right: body("right", "Right", 2048, 1154, 0.7506, 0.453, 0.03861, true),
  left: body("left", "Left", 2048, 1347, 0.2956, 0.4237, 0.0435, true),
};

/**
 * Default fit for a typical centred portrait: glasses across the eyes at ~40%
 * height; the armor sits low (open top at 77%, shoulders at the canvas edges)
 * so the face and jaw stay clear and the chest mark stays in frame.
 */
export const DEFAULTS = {
  glasses: { cx: 0.5, cy: 0.405, glassW: 0.46 },
  body: { cx: 0.5, cy: 0.77, moduleH: 0.039 },
  glass: 0.74,
  angle: "front" as BodyAngle,
};

export const EXPORT_SIZE = 2048;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
