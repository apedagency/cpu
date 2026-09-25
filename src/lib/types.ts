/**
 * Normalised shapes returned by our own API routes. Third-party payloads are
 * mapped into these in `lib/api/*` and never reach components directly.
 *
 * Convention: `null` means "the source did not provide this" — the UI renders
 * it as Unavailable. A real zero is always the number 0.
 */

export type SourceName = "signal" | "dexscreener" | "geckoterminal" | "hyperevm";

export interface Envelope<T> {
  data: T;
  /** Unix ms when our server assembled the payload. */
  fetchedAt: number;
  /** Upstreams that contributed, in priority order. */
  sources: SourceName[];
  /** Partial failures that were degraded rather than thrown. */
  warnings: string[];
}

export interface MarketSnapshot {
  priceUsd: number | null;
  /** Price in wNVDAx per CPU. */
  priceNative: number | null;
  change: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  marketCapUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  txns24h: { buys: number; sells: number } | null;
  pairCreatedAt: number | null;
  /** Unix ms of the price print the source reported, when it reports one. */
  priceAt: number | null;
}

export interface RewardTerms {
  /** Pool fee on every trade, in basis points (100 = 1%). */
  poolFeeBps: number;
  /** Share of each pool fee the venue keeps before the pad collects (Project X: 1/7). */
  venueCut: number;
  /** Launcher share of what the pad collects, in bps — streamed to holders for CPU. */
  holderShareBps: number;
  /** Where the launcher share goes: "holders" for CPU. */
  mode: string | null;
  /** Holder-directed fraction of each trade's value, derived from the three terms above. */
  holderFractionOfTrade: number;
}

export interface PaidLedger {
  /** Sum of payout receipts, in the payout asset. */
  amount: number;
  /** USD valued at each receipt's own print (Signal's accounting). */
  usd: number | null;
  holdersPaid: number | null;
  payouts: number | null;
  lastAt: number | null;
  lastTx: string | null;
}

export interface ChainLedger {
  /** totalCredited(): payout asset credited into the dividend accounting. */
  credited: number;
  /** totalWithdrawn(): payout asset that has left the contract to holders. */
  withdrawn: number;
  /** credited − withdrawn: accrued to holders, not yet paid out. */
  awaitingClaim: number;
  stream: {
    total: number;
    released: number;
    startedAt: number | null;
    periodSeconds: number;
  };
  /** Supply currently counted for rewards (excludes pool/burn per contract rules). */
  eligibleSupply: number;
  /** Minimum CPU balance for a wallet to be counted. */
  minEligible: number;
  readAt: number;
}

export interface RewardSnapshot {
  payout: {
    symbol: string;
    address: string;
    priceUsd: number | null;
  };
  terms: RewardTerms | null;
  paid: PaidLedger | null;
  chain: ChainLedger | null;
  supply: {
    total: number | null;
    burned: number | null;
  };
}

export interface HolderPosition {
  address: string;
  balance: number;
  /** withdrawn(address): payout asset already paid to this wallet. */
  paid: number;
  /** withdrawableDividendOf(address): accrued and claimable now. */
  claimable: number;
  /** accumulativeDividendOf(address): paid + claimable. */
  earned: number;
  eligible: boolean;
  readAt: number;
}

export type CandleRange = "1H" | "6H" | "24H" | "7D" | "ALL";

export interface Candle {
  /** Unix seconds, candle open. */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  /** USD volume when the source provides it. */
  v: number | null;
}

export interface CandleSeries {
  range: CandleRange;
  intervalSeconds: number;
  /** Window the series was requested for, unix seconds. */
  from: number;
  to: number;
  candles: Candle[];
}
