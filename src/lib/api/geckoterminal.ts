import { upstream } from "@/lib/config";
import type { Candle } from "@/lib/types";
import { getJson } from "./http";

type Timeframe = "minute" | "hour" | "day";

/**
 * GeckoTerminal pool OHLCV in USD. Only buckets that saw a trade are
 * returned, so a `limit` of N can span far more than N intervals — callers
 * filter by time window instead of trusting the count.
 */
export async function fetchGeckoCandles(
  poolAddress: string,
  timeframe: Timeframe,
  aggregate: number,
  limit: number,
): Promise<Candle[]> {
  const url =
    `${upstream.geckoterminal}/networks/${upstream.geckoNetwork}/pools/${poolAddress.toLowerCase()}` +
    `/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`;
  const r = await getJson<{ data?: { attributes?: { ohlcv_list?: unknown[] } } }>(
    "geckoterminal",
    url,
    60,
    12_000,
  );
  const rows = r.data?.attributes?.ohlcv_list;
  if (!Array.isArray(rows)) return [];
  const out: Candle[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const [t, o, h, l, c, v] = row.map(Number);
    if (![t, o, h, l, c].every(Number.isFinite) || c <= 0) continue;
    out.push({ t, o, h, l, c, v: Number.isFinite(v) ? v : null });
  }
  return out.sort((a, b) => a.t - b.t);
}
