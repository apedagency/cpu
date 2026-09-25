import type { BackgroundId, EffectId, LayerId } from "./manifest";

export interface LayerTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface PfpState {
  background: BackgroundId;
  effect: EffectId;
  selected: LayerId;
  linkedKit: boolean;
  transforms: Record<LayerId, LayerTransform>;
}

export const DEFAULT_TRANSFORMS: Record<LayerId, LayerTransform> = {
  userPfp: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
  body: { x: 0, y: 0.03, scale: 1, rotation: 0, opacity: 1 },
  helmet: { x: 0, y: -0.01, scale: 1, rotation: 0, opacity: 1 },
  visor: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 0.92 },
};

export const DEFAULT_STATE: PfpState = {
  background: "glass",
  effect: "glow",
  selected: "userPfp",
  linkedKit: true,
  transforms: structuredClone(DEFAULT_TRANSFORMS),
};

export const TRANSFORM_LIMITS = {
  x: [-0.5, 0.5],
  y: [-0.5, 0.5],
  scale: [0.45, 1.8],
  rotation: [-90, 90],
  opacity: [0.15, 1],
} as const;

export const clamp = (value: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, value));

export function cleanTransform(next: LayerTransform): LayerTransform {
  return {
    x: clamp(next.x, TRANSFORM_LIMITS.x),
    y: clamp(next.y, TRANSFORM_LIMITS.y),
    scale: clamp(next.scale, TRANSFORM_LIMITS.scale),
    rotation: clamp(next.rotation, TRANSFORM_LIMITS.rotation),
    opacity: clamp(next.opacity, TRANSFORM_LIMITS.opacity),
  };
}

export function freshDefaultState(): PfpState {
  return { ...DEFAULT_STATE, transforms: structuredClone(DEFAULT_TRANSFORMS) };
}
