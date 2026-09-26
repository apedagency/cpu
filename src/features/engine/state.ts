import { DEFAULTS, type BodyAngle, type LayerId } from "./manifest";

export interface Transform {
  /** Offset in stage fractions. */
  x: number;
  y: number;
  scale: number;
  /** Degrees. */
  rotation: number;
}

export interface PfpState {
  selected: LayerId;
  /** Glass density, 0..1. */
  glass: number;
  angle: BodyAngle;
  bodyOn: boolean;
  transforms: Record<LayerId, Transform>;
}

export const IDENTITY: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };

export function freshState(selected: LayerId = "userPfp"): PfpState {
  return {
    selected,
    glass: DEFAULTS.glass,
    angle: DEFAULTS.angle,
    bodyOn: true,
    transforms: { userPfp: { ...IDENTITY }, glasses: { ...IDENTITY }, body: { ...IDENTITY } },
  };
}

/** Scale and offset (stage fractions) limits per layer. Head sizes vary wildly, so the body gets a wide range. */
export const LIMITS: Record<LayerId, { scale: [number, number]; offset: number }> = {
  userPfp: { scale: [0.4, 4], offset: 0.7 },
  glasses: { scale: [0.35, 2.6], offset: 0.7 },
  body: { scale: [0.25, 3.5], offset: 0.9 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clean(id: LayerId, t: Transform): Transform {
  const { scale: [lo, hi], offset } = LIMITS[id];
  let rotation = ((((t.rotation + 180) % 360) + 360) % 360) - 180;
  if (Math.abs(rotation) < 0.01) rotation = 0;
  return {
    x: clamp(t.x, -offset, offset),
    y: clamp(t.y, -offset, offset),
    scale: clamp(t.scale, lo, hi),
    rotation,
  };
}

/** Reset a layer's fit. Glasses also get their default glass back; the body keeps its angle. */
export function resetLayer(state: PfpState, layer: LayerId): PfpState {
  return {
    ...state,
    glass: layer === "glasses" ? DEFAULTS.glass : state.glass,
    transforms: { ...state.transforms, [layer]: { ...IDENTITY } },
  };
}
