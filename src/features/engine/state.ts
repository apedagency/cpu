import { DEFAULTS, type LayerId } from "./manifest";

export interface Transform {
  /** Offset in stage fractions. */
  x: number;
  y: number;
  scale: number;
  /** Degrees. */
  rotation: number;
}

/**
 * `head` moves the visor and crown together. While the head kit is linked
 * (the default) visor and helmet gestures write to `head`, so both pivot on
 * the same point and can't drift apart; unlinked, they write their own local
 * transform nested inside the head frame.
 */
export type TransformId = "userPfp" | "head" | "visor" | "helmet" | "body";

export interface PfpState {
  selected: LayerId;
  linked: boolean;
  glass: number;
  transforms: Record<TransformId, Transform>;
}

export const IDENTITY: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };

const fresh = (): Record<TransformId, Transform> => ({
  userPfp: { ...IDENTITY },
  head: { ...IDENTITY },
  visor: { ...IDENTITY },
  helmet: { ...IDENTITY },
  body: { ...IDENTITY },
});

export function freshState(): PfpState {
  return { selected: "userPfp", linked: true, glass: DEFAULTS.glass, transforms: fresh() };
}

/** The transform a gesture on `layer` edits. */
export function targetOf(layer: LayerId, linked: boolean): TransformId {
  if (linked && (layer === "visor" || layer === "helmet")) return "head";
  return layer;
}

const LIMITS = {
  offset: 0.65,
  scale: { userPfp: [0.4, 4], kit: [0.35, 2.4] },
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clean(id: TransformId, t: Transform): Transform {
  const [lo, hi] = id === "userPfp" ? LIMITS.scale.userPfp : LIMITS.scale.kit;
  let rotation = ((((t.rotation + 180) % 360) + 360) % 360) - 180;
  if (Math.abs(rotation) < 0.01) rotation = 0;
  return {
    x: clamp(t.x, -LIMITS.offset, LIMITS.offset),
    y: clamp(t.y, -LIMITS.offset, LIMITS.offset),
    scale: clamp(t.scale, lo, hi),
    rotation,
  };
}

/** Resetting either half of a linked head kit resets the whole kit. */
export function resetLayer(state: PfpState, layer: LayerId): PfpState {
  const transforms = { ...state.transforms };
  if (layer === "visor" || layer === "helmet") {
    if (state.linked) {
      transforms.head = { ...IDENTITY };
      transforms.visor = { ...IDENTITY };
      transforms.helmet = { ...IDENTITY };
    } else {
      transforms[layer] = { ...IDENTITY };
    }
    return { ...state, transforms, glass: layer === "visor" ? DEFAULTS.glass : state.glass };
  }
  transforms[layer] = { ...IDENTITY };
  return { ...state, transforms };
}
