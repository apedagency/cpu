/**
 * The CPU wearable kit, extracted from official art (see
 * docs/pfp-kit-architecture.md). Geometry is measured from the source files:
 * the visor layers share one frame, the crown knows where the visor sits in
 * it, and the body knows where its neck opening is.
 *
 * Stage coordinates are fractions of the square canvas (0..1).
 */

export type LayerId = "userPfp" | "visor" | "helmet" | "body";
export type KitLayerId = Exclude<LayerId, "userPfp">;

export const KIT_SRC = {
  visorTint: "/pfp-kit/visor-tint.webp",
  visorEdge: "/pfp-kit/visor-edge.webp",
  visorLight: "/pfp-kit/visor-light.webp",
  crown: "/pfp-kit/crown.webp",
  body: "/pfp-kit/body.webp",
} as const;

export type KitAsset = keyof typeof KIT_SRC;
export const ASSET_SRCS = Object.values(KIT_SRC);

/** Visor layer frame: 1547 × 693 px, the glass itself spans [24,24]–[1522,668]. */
export const VISOR = {
  aspect: 693 / 1547,
  /** Glass width as a fraction of the layer width. */
  glass: (1522 - 24) / 1547,
  /** Official Hyperliquid mark: centre and width in layer fractions. */
  mark: { cx: 0.5087, cy: 0.4877, w: 0.32 },
  /** Multiply pass that turns the glass green over any skin tone. */
  multiply: "rgb(40 150 136)",
};

/** Crown frame: 1862 × 989 px at the extraction scale; visor box [182,517]–[1680,1161]. */
export const CROWN = {
  aspect: 989 / 1862,
  /** Crown width relative to the glass width. */
  perGlass: 1862 / (1680 - 182),
  /** Where the glass centre sits inside the crown, in crown fractions. */
  glassCx: ((182 + 1680) / 2) / 1862,
  glassCy: ((517 + 1161) / 2) / 989,
};

/** Body frame: 2304 × 958 (from the 3200 × 1330 extraction). */
export const BODY = {
  aspect: 958 / 2304,
  /** Neck-opening centre in body fractions (the bust is a three-quarter view). */
  neckCx: 0.47,
};

/**
 * Default fit for a typical centred PFP: the glass lands across the eyes at
 * ~42% height, the crown already surrounds it, the collar sits under the chin.
 */
export const DEFAULTS = {
  head: { cx: 0.5, cy: 0.415, glassW: 0.58 },
  body: { top: 0.635, w: 1.08 },
  glass: 0.74,
};

export const EXPORT_SIZE = 2048;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
