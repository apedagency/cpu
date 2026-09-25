import { pairedAsset, pool, token, upstream } from "@/lib/config";
import type {
  CandleRange,
  CandleSeries,
  Envelope,
  HolderPosition,
  MarketSnapshot,
  RewardSnapshot,
  SourceName,
} from "@/lib/types";
import { fetchDexPair } from "./dexscreener";
import { fetchGeckoCandles } from "./geckoterminal";
import { readDividendState, readHolder } from "./hyperevm";
import { fetchSignalCandles, fetchSignalPrice, fetchSignalToken } from "./signal";

const settle = async <T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> => {
  try {
    return { ok: true, value: await p };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

const first = <T>(...vals: (T | null | undefined)[]): T | null => {
  for (const v of vals) if (v !== null && v !== undefined) return v;
  return null;
};

/* ------------------------------------------------------------------ market */

export async function getMarket(): Promise<Envelope<MarketSnapshot>> {
  const [dex, sig] = await Promise.all([
    settle(fetchDexPair(upstream.dexscreenerChain, pool.address)),
    settle(fetchSignalToken(token.address)),
  ]);
  const d = dex.ok ? dex.value : null;
  const s = sig.ok ? sig.value : null;
  if (!d && !s) throw new Error("market sources unavailable");

  const warnings: string[] = [];
  if (!dex.ok) warnings.push(dex.error);
  if (!sig.ok) warnings.push(sig.error);
  const sources: SourceName[] = [];
  if (d) sources.push("dexscreener");
  if (s) sources.push("signal");

  return {
    fetchedAt: Date.now(),
    sources,
    warnings,
    data: {
      priceUsd: first(d?.priceUsd, s?.priceUsd),
      priceNative: d?.priceNative ?? null,
      change: {
        m5: first(d?.change.m5, s?.change.m5),
        h1: first(d?.change.h1, s?.change.h1),
        h6: d?.change.h6 ?? null,
        h24: first(d?.change.h24, s?.change.h24),
      },
      marketCapUsd: first(d?.marketCapUsd, s?.marketCapUsd),
      fdvUsd: d?.fdvUsd ?? null,
      liquidityUsd: first(d?.liquidityUsd, s?.liquidityUsd),
      volume24hUsd: first(d?.volume24hUsd, s?.volume24hUsd),
      txns24h: first(d?.txns24h, s?.txns24h),
      pairCreatedAt: first(d?.pairCreatedAt, s?.firstSeen ? s.firstSeen * 1000 : null),
      priceAt: d ? null : (s?.priceAt ?? null),
    },
  };
}

/* ----------------------------------------------------------------- rewards */

export async function getRewards(): Promise<Envelope<RewardSnapshot>> {
  const [sig, chain, payoutPrice] = await Promise.all([
    settle(fetchSignalToken(token.address)),
    settle(readDividendState()),
    settle(fetchSignalPrice(pairedAsset.wrapper.address)),
  ]);
  const s = sig.ok ? sig.value : null;
  const c = chain.ok ? chain.value : null;
  if (!s && !c) throw new Error("reward sources unavailable");

  const warnings: string[] = [];
  for (const r of [sig, chain, payoutPrice]) if (!r.ok) warnings.push(r.error);
  const sources: SourceName[] = [];
  if (s) sources.push("signal");
  if (c) sources.push("hyperevm");

  const terms = s?.terms
    ? {
        poolFeeBps: s.terms.feeBps,
        venueCut: pool.venueFeeShare,
        holderShareBps: s.terms.creatorBps,
        mode: s.terms.mode,
        holderFractionOfTrade:
          s.terms.mode === "holders"
            ? (s.terms.feeBps / 10_000) * (1 - pool.venueFeeShare) * (s.terms.creatorBps / 10_000)
            : 0,
      }
    : null;

  return {
    fetchedAt: Date.now(),
    sources,
    warnings,
    data: {
      payout: {
        symbol: s?.payout.symbol ?? pairedAsset.wrapper.symbol,
        address: s?.payout.address ?? pairedAsset.wrapper.address,
        priceUsd: payoutPrice.ok ? payoutPrice.value : null,
      },
      terms,
      paid: s?.paid ?? null,
      chain: c
        ? {
            credited: c.credited,
            withdrawn: c.withdrawn,
            awaitingClaim: Math.max(0, c.credited - c.withdrawn),
            stream: {
              total: c.streamTotal,
              released: c.streamReleased,
              startedAt: c.streamStart > 0 ? c.streamStart * 1000 : null,
              periodSeconds: c.distributionPeriod,
            },
            eligibleSupply: c.eligibleSupply,
            minEligible: c.minEligible,
            readAt: c.readAt,
          }
        : null,
      supply: { total: s?.supply ?? null, burned: s?.burned ?? null },
    },
  };
}

/* ------------------------------------------------------------------ holder */

export const isAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v);

export async function getHolder(address: string): Promise<Envelope<HolderPosition>> {
  const [h, state] = await Promise.all([readHolder(address), settle(readDividendState())]);
  return {
    fetchedAt: Date.now(),
    sources: ["hyperevm"],
    warnings: state.ok ? [] : [state.error],
    data: {
      address,
      balance: h.balance,
      paid: h.paid,
      claimable: h.claimable,
      earned: h.earned,
      eligible: state.ok ? h.balance >= state.value.minEligible : h.earned > 0,
      readAt: h.readAt,
    },
  };
}

/* ----------------------------------------------------------------- candles */

const RANGE_SECONDS: Record<Exclude<CandleRange, "ALL">, number> = {
  "1H": 3_600,
  "6H": 21_600,
  "24H": 86_400,
  "7D": 604_800,
};

export const isCandleRange = (v: string): v is CandleRange =>
  v === "1H" || v === "6H" || v === "24H" || v === "7D" || v === "ALL";

export async function getCandles(range: CandleRange): Promise<Envelope<CandleSeries>> {
  const now = Math.floor(Date.now() / 1000);
  const warnings: string[] = [];

  type Plan = { source: SourceName; interval: number; load: () => Promise<CandleSeries["candles"]> };
  const gecko = (tf: "minute" | "hour", agg: number, interval: number, limit: number): Plan => ({
    source: "geckoterminal",
    interval,
    load: () => fetchGeckoCandles(pool.address, tf, agg, limit),
  });
  const signal = (interval: 3600 | 14400, count: number): Plan => ({
    source: "signal",
    interval,
    load: () => fetchSignalCandles(token.address, interval, count),
  });

  // Signal's finest bucket is 1h, so intraday ranges lead with GeckoTerminal.
  const plans: Record<CandleRange, Plan[]> = {
    "1H": [gecko("minute", 1, 60, 300)],
    "6H": [gecko("minute", 5, 300, 300), signal(3600, 24)],
    "24H": [gecko("minute", 15, 900, 300), signal(3600, 48)],
    "7D": [signal(3600, 200), gecko("hour", 1, 3600, 200)],
    ALL: [signal(3600, 1500), gecko("hour", 1, 3600, 1000)],
  };

  for (const plan of plans[range]) {
    const res = await settle(plan.load());
    if (!res.ok) {
      warnings.push(res.error);
      continue;
    }
    let candles = res.value;
    let interval = plan.interval;
    // A token old enough to fill the hourly cap switches to 4h buckets for ALL.
    if (range === "ALL" && plan.source === "signal" && candles.length >= 1500) {
      const wide = await settle(fetchSignalCandles(token.address, 14400, 1500));
      if (wide.ok) {
        candles = wide.value;
        interval = 14400;
      }
    }
    const from = range === "ALL" ? (candles[0]?.t ?? now) : now - RANGE_SECONDS[range];
    candles = candles.filter((c) => c.t >= from - interval && c.t <= now);
    return {
      fetchedAt: Date.now(),
      sources: [plan.source],
      warnings,
      data: { range, intervalSeconds: interval, from, to: now, candles },
    };
  }
  throw new Error(warnings.join("; ") || "candles unavailable");
}
