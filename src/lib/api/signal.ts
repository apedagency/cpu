import { upstream } from "@/lib/config";
import type { Candle } from "@/lib/types";
import { finite, getJson } from "./http";

/** The subset of Signal's `/api/token/:address` payload we rely on. */
interface SignalTokenRaw {
  price?: number;
  price_ts?: number;
  mcap?: number;
  liq?: number;
  supply?: number;
  buys?: number;
  sells?: number;
  buy_usd?: number;
  sell_usd?: number;
  chg_5m?: number;
  chg_1h?: number;
  chg_24h?: number;
  first_seen?: number;
  fee_bps?: number;
  creator_bps?: number;
  creator_fees?: string;
  payout_symbol?: string;
  payout_asset?: string;
  paid_to_holders?: {
    amount?: number;
    usd?: number;
    holders_paid?: number;
    payouts?: number;
    last_ts?: number;
    last_tx?: string;
  } | null;
  custody?: {
    burned_raw?: string;
    total_supply_raw?: string;
    stale?: boolean;
    error?: boolean;
  } | null;
}

export interface SignalToken {
  priceUsd: number | null;
  priceAt: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  txns24h: { buys: number; sells: number } | null;
  change: { m5: number | null; h1: number | null; h24: number | null };
  firstSeen: number | null;
  supply: number | null;
  burned: number | null;
  terms: { feeBps: number; creatorBps: number; mode: string | null } | null;
  payout: { symbol: string | null; address: string | null };
  paid: {
    amount: number;
    usd: number | null;
    holdersPaid: number | null;
    payouts: number | null;
    lastAt: number | null;
    lastTx: string | null;
  } | null;
}

const raw18 = (s?: string) => {
  if (!s || !/^\d+$/.test(s)) return null;
  // Whole-token precision is plenty for display; avoid BigInt→Number overflow.
  return Number(BigInt(s) / 10n ** 12n) / 1e6;
};

export async function fetchSignalToken(address: string): Promise<SignalToken> {
  const r = await getJson<SignalTokenRaw>(
    "signal",
    `${upstream.signal}/token/${address.toLowerCase()}`,
    15,
  );

  const buyUsd = finite(r.buy_usd);
  const sellUsd = finite(r.sell_usd);
  const p = r.paid_to_holders;
  const custodyOk = r.custody && !r.custody.error;

  return {
    priceUsd: finite(r.price),
    priceAt: finite(r.price_ts) !== null ? r.price_ts! * 1000 : null,
    marketCapUsd: finite(r.mcap),
    liquidityUsd: finite(r.liq),
    volume24hUsd: buyUsd !== null && sellUsd !== null ? buyUsd + sellUsd : null,
    txns24h:
      finite(r.buys) !== null && finite(r.sells) !== null
        ? { buys: r.buys!, sells: r.sells! }
        : null,
    change: { m5: finite(r.chg_5m), h1: finite(r.chg_1h), h24: finite(r.chg_24h) },
    firstSeen: finite(r.first_seen),
    supply: finite(r.supply),
    burned: custodyOk ? raw18(r.custody!.burned_raw) : null,
    terms:
      finite(r.fee_bps) !== null && finite(r.creator_bps) !== null
        ? { feeBps: r.fee_bps!, creatorBps: r.creator_bps!, mode: r.creator_fees ?? null }
        : null,
    payout: { symbol: r.payout_symbol ?? null, address: r.payout_asset ?? null },
    paid:
      p && finite(p.amount) !== null
        ? {
            amount: p.amount!,
            usd: finite(p.usd),
            holdersPaid: finite(p.holders_paid),
            payouts: finite(p.payouts),
            lastAt: finite(p.last_ts) !== null ? p.last_ts! * 1000 : null,
            lastTx: typeof p.last_tx === "string" ? p.last_tx : null,
          }
        : null,
  };
}

export async function fetchSignalPrice(address: string): Promise<number | null> {
  const r = await getJson<{ price?: number }>(
    "signal",
    `${upstream.signal}/token/${address.toLowerCase()}`,
    30,
  );
  return finite(r.price);
}

/**
 * Signal candles: `[ts, open, high, low, close, volUsd, buyVolUsd, trades]`.
 * Signal's smallest bucket is one hour — finer requests return hourly data.
 */
export async function fetchSignalCandles(
  address: string,
  intervalSeconds: 3600 | 14400,
  count: number,
): Promise<Candle[]> {
  const rows = await getJson<unknown[]>(
    "signal",
    `${upstream.signal}/candles/${address.toLowerCase()}?s=${intervalSeconds}&n=${count}`,
    60,
  );
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
