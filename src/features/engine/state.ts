import { BADGES, LIGHTS, manifest, type BadgeId, type BackgroundId, type BaseId, type LightId } from "./manifest";

export interface PfpState {
  base: BaseId;
  background: BackgroundId;
  light: LightId;
  badge: BadgeId;
  /** Multiplier on the base layer's default framing. */
  zoom: number;
  /** Offset of the image centre on the unit square. */
  x: number;
  y: number;
  name: string;
  seed: number;
}

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 1.6;
export const NAME_MAX = 18;

export const DEFAULT_STATE: PfpState = {
  base: "bust",
  background: "visor",
  light: "glow",
  badge: "mark",
  zoom: 1,
  x: 0,
  y: 0,
  name: "",
  seed: 1,
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Printable characters only, collapsed whitespace, length-capped. */
export function sanitizeName(raw: string) {
  return raw
    .normalize("NFKC")
    .replace(/[\p{C}]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX);
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same seed, same PFP. */
export function randomState(seed: number, keepName = ""): PfpState {
  const rand = mulberry32(seed);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
  return {
    base: pick(manifest.base).id,
    background: pick(manifest.backgrounds).id,
    light: pick(LIGHTS).id,
    badge: pick(BADGES).id,
    zoom: Number((0.9 + rand() * 0.25).toFixed(3)),
    x: Number(((rand() - 0.5) * 0.08).toFixed(3)),
    y: Number(((rand() - 0.5) * 0.06).toFixed(3)),
    name: keepName,
    seed,
  };
}

export const newSeed = () => (crypto.getRandomValues(new Uint32Array(1))[0] % 999_999) + 1;

/* ------------------------------------------------------------ URL state */

const b64url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const unb64url = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

export function encodeState(s: PfpState) {
  return b64url(JSON.stringify([s.base, s.background, s.light, s.badge, s.zoom, s.x, s.y, s.name, s.seed]));
}

/** Validates every field — URL input is untrusted. */
export function decodeState(raw: string | null): PfpState | null {
  if (!raw || raw.length > 400) return null;
  try {
    const a = JSON.parse(unb64url(raw));
    if (!Array.isArray(a) || a.length !== 9) return null;
    const [base, background, light, badge, zoom, x, y, name, seed] = a;
    if (!manifest.base.some((b) => b.id === base)) return null;
    if (!manifest.backgrounds.some((b) => b.id === background)) return null;
    if (!LIGHTS.some((l) => l.id === light)) return null;
    if (!BADGES.some((b) => b.id === badge)) return null;
    if (![zoom, x, y, seed].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    return {
      base,
      background,
      light,
      badge,
      zoom: clamp(zoom, ZOOM_MIN, ZOOM_MAX),
      x: clamp(x, -0.5, 0.5),
      y: clamp(y, -0.5, 0.5),
      name: typeof name === "string" ? sanitizeName(name) : "",
      seed: clamp(Math.round(seed), 0, 999_999),
    };
  } catch {
    return null;
  }
}
