"use client";

import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import BalanceChart from "@/components/ui/balance-chart";
import { useMarket } from "@/features/data/market-context";
import { useLive } from "@/hooks/use-live";
import { links, pairedAsset, pool, refresh, token } from "@/lib/config";
import { ago, amount, dateTime, pct, price, UNAVAILABLE, usd } from "@/lib/format";
import type { CandleRange, CandleSeries } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_RANGES: CandleRange[] = ["1H", "6H", "24H", "7D", "ALL"];
const DAY = 86_400;

function axisLabels(from: number, to: number): { t: number; label: string }[] {
  const span = to - from;
  const step =
    span <= 3_600 ? 900 : span <= 6 * 3_600 ? 3_600 : span <= DAY ? 6 * 3_600 : span <= 3 * DAY ? 12 * 3_600 : DAY;
  const fmt = new Intl.DateTimeFormat("en-US", span > 2 * DAY ? { month: "short", day: "numeric" } : { hour: "2-digit", minute: "2-digit", hour12: false });
  const out: { t: number; label: string }[] = [];
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) out.push({ t, label: fmt.format(t * 1000) });
  // Keep at most five labels.
  const every = Math.ceil(out.length / 5);
  return out.filter((_, i) => i % every === 0);
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-paper/50">{label}</dt>
      <dd className="tabular mt-1.5 text-[clamp(1.25rem,1.9vw,1.6rem)] font-semibold leading-none tracking-[-0.02em] text-paper">{value}</dd>
      {children}
    </div>
  );
}

export function Market() {
  const market = useMarket();
  const m = market.data;
  const ageSeconds = m?.pairCreatedAt && market.fetchedAt ? (market.fetchedAt - m.pairCreatedAt) / 1000 : null;
  const ranges = useMemo(
    () => ALL_RANGES.filter((r) => r !== "7D" || ageSeconds === null || ageSeconds > 3 * DAY),
    [ageSeconds],
  );
  const [range, setRange] = useState<CandleRange>("24H");
  const candles = useLive<CandleSeries>(`/api/candles?range=${range}`, refresh.candles);

  const series = candles.data?.range === range ? candles.data : null;
  const points = useMemo(() => series?.candles.map((c) => ({ t: c.t, v: c.c })) ?? [], [series]);
  const domain: [number, number] = series ? [series.from, series.to] : [0, 1];
  const change = m?.change.h24 ?? null;
  const tx = m?.txns24h ?? null;
  const buyShare = tx && tx.buys + tx.sells > 0 ? tx.buys / (tx.buys + tx.sells) : null;

  return (
    <section id="market" tabIndex={-1} aria-labelledby="market-title" className="relative px-(--gutter) pb-[clamp(5rem,9vw,8rem)] pt-[clamp(5rem,10vw,9rem)]">
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
        <div>
          <h2 id="market-title" className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold text-paper">
            {token.symbol} <span className="text-paper/35">/</span> {pairedAsset.wrapper.symbol}
            <span className="text-sm font-normal text-paper/45">
              {pool.venue} pool · priced against {pairedAsset.wrapper.name}
            </span>
          </h2>
          <div className="mt-3 flex min-h-[clamp(3rem,7.5vw,6.75rem)] flex-wrap items-baseline gap-x-5">
            {market.status === "loading" ? (
              <span className="skeleton block h-[clamp(3rem,7vw,6rem)] w-72 rounded-xs" />
            ) : market.status === "error" ? (
              <span className="self-center text-[clamp(1.25rem,2.2vw,1.75rem)] font-semibold text-paper/70">Price unavailable right now</span>
            ) : (
              <>
                <span className="tabular text-[clamp(3rem,7.5vw,6.75rem)] font-semibold leading-none tracking-[-0.045em] text-paper">{price(m?.priceUsd)}</span>
                <span className={cn("tabular text-base font-medium", change === null ? "text-muted-foreground" : change >= 0 ? "text-teal" : "text-fog")}>
                  {pct(change)} <span className="text-paper/40">24h</span>
                </span>
              </>
            )}
          </div>
        </div>
        <a
          href={links.dexscreener}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-paper/75 transition-colors hover:text-paper"
        >
          <span className="underline-offset-[6px] group-hover:underline">Full chart on Dexscreener</span>
          <ArrowUpRight className="size-4 text-mint/70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>

      <div className="mt-10 min-w-0">
        <BalanceChart
          points={points}
          domain={domain}
          status={series ? "ready" : candles.status === "error" ? "error" : "loading"}
          timeframes={ranges}
          timeframe={range}
          onTimeframe={setRange}
          formatValue={(v) => price(v)}
          formatTime={(t) => dateTime(t * 1000)}
          xLabels={series ? axisLabels(series.from, series.to) : []}
          ariaLabel={`CPU price in USD, ${range}`}
          errorSlot={
            <span>
              Price history is unavailable right now.{" "}
              <button type="button" onClick={candles.refresh} className="text-mint underline underline-offset-4">
                Retry
              </button>
            </span>
          }
        />
        <p className="mt-3 text-xs text-paper/40">
          {series
            ? `${series.candles.length} ${series.intervalSeconds >= 3600 ? `${series.intervalSeconds / 3600}h` : `${series.intervalSeconds / 60}m`} candles with trades · closes shown · gaps are intervals without trades`
            : " "}
        </p>
      </div>

      <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Market cap" value={usd(m?.marketCapUsd ?? null, "compact")} />
        <Stat label="Liquidity" value={usd(m?.liquidityUsd ?? null, "compact")} />
        <Stat label="24h volume" value={usd(m?.volume24hUsd ?? null, "compact")} />
        <Stat label="24h trades" value={tx ? amount(tx.buys + tx.sells, 0) : UNAVAILABLE}>
          {tx && buyShare !== null && (
            <dd className="mt-2.5">
              <span className="flex h-px w-full max-w-36 bg-fog/30" aria-hidden="true">
                <span className="h-full bg-teal shadow-[0_0_8px_var(--cpu-teal)]" style={{ width: `${buyShare * 100}%` }} />
              </span>
              <span className="mt-1.5 block text-xs text-paper/45">
                {amount(tx.buys, 0)} buys · {amount(tx.sells, 0)} sells
              </span>
            </dd>
          )}
        </Stat>
        <Stat label="Fully diluted" value={usd(m?.fdvUsd ?? null, "compact")} />
        <Stat label="Pool opened" value={m?.pairCreatedAt ? ago(m.pairCreatedAt) : UNAVAILABLE} />
      </dl>
      <p className="mt-10 text-[0.6875rem] uppercase tracking-[0.14em] text-paper/35">
        {market.status === "error" ? "Unavailable" : market.stale ? "Delayed" : market.fetchedAt ? `Updated ${ago(market.fetchedAt)}` : "Loading"}
      </p>
    </section>
  );
}
