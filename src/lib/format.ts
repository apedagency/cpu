/** Display formatters. All accept `null` and return the Unavailable label. */

export const UNAVAILABLE = "Unavailable";

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const wholeUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const centsUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function usd(v: number | null | undefined, mode: "auto" | "compact" | "whole" = "auto") {
  if (v === null || v === undefined || !Number.isFinite(v)) return UNAVAILABLE;
  if (mode === "compact") return compactUsd.format(v);
  if (mode === "whole") return wholeUsd.format(v);
  if (Math.abs(v) >= 1_000_000) return compactUsd.format(v);
  if (Math.abs(v) >= 1 || v === 0) return centsUsd.format(v);
  return `$${sig(v, 4)}`;
}

/** Token price: small numbers keep 4 significant figures (0.0001164). */
export function price(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return UNAVAILABLE;
  return v >= 1 ? centsUsd.format(v) : `$${sig(v, 4)}`;
}

export function sig(v: number, digits: number) {
  if (v === 0) return "0";
  const s = v.toPrecision(digits);
  // toPrecision may return exponent form for very small values.
  return s.includes("e") ? v.toFixed(Math.min(20, digits - Math.floor(Math.log10(Math.abs(v))) - 1)) : s;
}

export function pct(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return UNAVAILABLE;
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(digits)}%`;
}

export function amount(v: number | null | undefined, maxFraction = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return UNAVAILABLE;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFraction }).format(v);
}

export function compact(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return UNAVAILABLE;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);
}

/** Payout-asset amounts are tiny; keep enough precision to be truthful. */
export function assetAmount(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return UNAVAILABLE;
  if (v === 0) return "0";
  if (Math.abs(v) >= 1) return amount(v, 4);
  return sig(v, 4);
}

export function ago(ms: number | null | undefined, now = Date.now()) {
  if (!ms) return UNAVAILABLE;
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function clockTime(ms: number) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(ms);
}

export function dateTime(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ms);
}
