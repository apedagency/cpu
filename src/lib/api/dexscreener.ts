import { upstream } from "@/lib/config";
import { finite, getJson } from "./http";

interface DexPairRaw {
  priceUsd?: string;
  priceNative?: string;
  priceChange?: Record<string, number>;
  liquidity?: { usd?: number };
  volume?: Record<string, number>;
  txns?: Record<string, { buys?: number; sells?: number }>;
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
}

export interface DexPair {
  priceUsd: number | null;
  priceNative: number | null;
  change: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  txns24h: { buys: number; sells: number } | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  pairCreatedAt: number | null;
}

export async function fetchDexPair(network: string, pairAddress: string): Promise<DexPair | null> {
  const r = await getJson<{ pair?: DexPairRaw | null; pairs?: DexPairRaw[] | null }>(
    "dexscreener",
    `${upstream.dexscreener}/latest/dex/pairs/${network}/${pairAddress.toLowerCase()}`,
    20,
  );
  const p = r.pair ?? r.pairs?.[0];
  if (!p) return null;

  const t24 = p.txns?.h24;
  return {
    priceUsd: finite(p.priceUsd),
    priceNative: finite(p.priceNative),
    change: {
      m5: finite(p.priceChange?.m5),
      h1: finite(p.priceChange?.h1),
      h6: finite(p.priceChange?.h6),
      h24: finite(p.priceChange?.h24),
    },
    liquidityUsd: finite(p.liquidity?.usd),
    volume24hUsd: finite(p.volume?.h24),
    txns24h:
      t24 && finite(t24.buys) !== null && finite(t24.sells) !== null
        ? { buys: t24.buys!, sells: t24.sells! }
        : null,
    marketCapUsd: finite(p.marketCap),
    fdvUsd: finite(p.fdv),
    pairCreatedAt: finite(p.pairCreatedAt),
  };
}
