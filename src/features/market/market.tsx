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
    <div className="flex items-baseline justify-between gap-6 border-t border-mint/10 py-4">
      <dt className="text-sm text-paper/70">{label}</dt>
      <dd className="tabular text-right">
        <span className="text-lg font-semibold text-paper">{value}</span>
        {children}
      </dd>
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
    <section
      id="market"
      tabIndex={-1}
      aria-labelledby="market-title"
      className="relative overflow-hidden bg-cpu-black px-(--gutter) py-[clamp(5rem,10vw,9rem)] outline-none"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(60%_60%_at_30%_0%,rgba(0,240,230,0.08),transparent_70%)]"
      />
      <header className="relative mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="type-label mb-4 text-mint">Market</p>
          <h2
            id="market-title"
            className="text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-paper [font-variation-settings:'wdth'_110,'opsz'_120]"
          >
            {token.symbol} <span className="text-paper/40">/</span> {pairedAsset.wrapper.symbol}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {pool.venue} pool · priced against {pairedAsset.wrapper.name}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 md:items-end" aria-live="polite">
          {market.status === "loading" ? (
            <span className="skeleton h-12 w-48 rounded" />
          ) : (
            <>
              <span className="tabular text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none tracking-[-0.02em] text-paper">{price(m?.priceUsd)}</span>
              <span className={cn("tabular text-sm font-medium", change === null ? "text-muted-foreground" : change >= 0 ? "text-teal" : "text-fog")}>
                {pct(change)} over 24h
              </span>
            </>
          )}
        </div>
      </header>

      <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0">
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
          <p className="mt-4 text-xs text-muted-foreground">
            {series
              ? `${series.candles.length} ${series.intervalSeconds >= 3600 ? `${series.intervalSeconds / 3600}h` : `${series.intervalSeconds / 60}m`} candles with trades · closes shown · gaps are intervals without trades`
              : " "}
          </p>
        </div>

        <div className="flex flex-col">
          <dl>
            <Stat label="Market cap" value={usd(m?.marketCapUsd ?? null, "compact")} />
            <Stat label="Liquidity" value={usd(m?.liquidityUsd ?? null, "compact")} />
            <Stat label="24h volume" value={usd(m?.volume24hUsd ?? null, "compact")} />
            <Stat label="24h trades" value={tx ? amount(tx.buys + tx.sells, 0) : UNAVAILABLE}>
              {tx && buyShare !== null && (
                <span className="mt-2 flex flex-col items-end gap-1.5">
                  <span className="flex h-1.5 w-40 overflow-hidden rounded-full bg-fog/25" aria-hidden="true">
                    <span className="h-full bg-teal" style={{ width: `${buyShare * 100}%` }} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {amount(tx.buys, 0)} buys · {amount(tx.sells, 0)} sells
                  </span>
                </span>
              )}
            </Stat>
            <Stat label="Fully diluted" value={usd(m?.fdvUsd ?? null, "compact")} />
            <Stat label="Pool opened" value={m?.pairCreatedAt ? ago(m.pairCreatedAt) : UNAVAILABLE} />
          </dl>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-mint/10 pt-6">
            <p className="type-label" aria-live="polite">
              {market.status === "error" ? "Unavailable" : market.stale ? "Delayed" : market.fetchedAt ? `Updated ${ago(market.fetchedAt)}` : "Loading"}
            </p>
            <a
              href={links.dexscreener}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex min-h-11 items-center gap-2 rounded-md border border-teal/60 px-4 text-sm font-semibold text-teal transition-colors hover:bg-teal hover:text-ink-1"
            >
              View on Dexscreener
              <ArrowUpRight className="size-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
