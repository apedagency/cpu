"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { Live } from "@/hooks/use-live";
import { network, pool } from "@/lib/config";
import { ago, amount, assetAmount, clockTime, compact, UNAVAILABLE, usd } from "@/lib/format";
import type { RewardSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

function Figure({
  kind,
  label,
  value,
  unit,
  sub,
  loading,
  className,
}: {
  kind: "Paid" | "Pending" | "Historical" | "Live";
  label: string;
  value: string;
  unit?: string;
  sub?: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 border-t border-mint/12 pt-5", className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em]",
            kind === "Paid" && "bg-teal/15 text-teal",
            kind === "Pending" && "bg-mint/10 text-mint",
            kind === "Historical" && "bg-paper/8 text-paper/70",
            kind === "Live" && "bg-teal text-ink-1",
          )}
        >
          {kind}
        </span>
        <span className="text-sm text-paper/70">{label}</span>
      </div>
      {loading ? (
        <span className="skeleton h-9 w-40 rounded" />
      ) : (
        <p className="tabular flex items-baseline gap-2 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-none tracking-[-0.02em] text-paper">
          <span className="truncate">{value}</span>
          {unit && value !== UNAVAILABLE && <span className="text-base font-medium text-mint/80">{unit}</span>}
        </p>
      )}
      {sub && !loading && <div className="text-sm leading-relaxed text-muted-foreground">{sub}</div>}
    </div>
  );
}

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

export function RewardLedger({ live }: { live: Live<RewardSnapshot> }) {
  const { status, data, stale, fetchedAt } = live;
  const now = useNow(1000);
  const loading = status === "loading";
  const sym = data?.payout.symbol ?? "wNVDAx";
  const px = data?.payout.priceUsd ?? null;
  const chain = data?.chain ?? null;
  const paid = data?.paid ?? null;
  const terms = data?.terms ?? null;

  const toUsd = (v: number | null | undefined) => (v === null || v === undefined || px === null ? null : v * px);

  const stream = chain?.stream;
  const streamEnd = stream?.startedAt ? stream.startedAt + stream.periodSeconds * 1000 : null;
  const streamActive = !!(stream && streamEnd && now < streamEnd && stream.total > stream.released);
  const streamProgress = streamActive && stream?.startedAt ? (now - stream.startedAt) / (stream.periodSeconds * 1000) : 0;

  const paidShare = chain && chain.credited > 0 ? chain.withdrawn / chain.credited : 0;

  if (status === "error") {
    return (
      <div className="rounded-lg border border-mint/15 bg-ink-2/60 p-6 text-paper/80" role="alert">
        <p className="font-medium text-paper">Reward data is unavailable right now.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Signal and the HyperEVM RPC did not answer. Figures are hidden rather than guessed.
        </p>
        <button
          type="button"
          onClick={live.refresh}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-teal/50 px-4 text-sm font-medium text-teal hover:bg-teal/10"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Paid in <span className="text-paper">{sym}</span>
          {px !== null && (
            <>
              {" "}
              · {sym} {usd(px)}
            </>
          )}
        </p>
        <p className="type-label" aria-live="polite">
          {loading ? "Reading chain…" : stale ? `Delayed · last read ${ago(fetchedAt, now)}` : `Read ${ago(fetchedAt, now)}`}
        </p>
      </div>

      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
        <Figure
          kind="Historical"
          label="Credited to holders"
          loading={loading}
          value={chain ? assetAmount(chain.credited) : UNAVAILABLE}
          unit={sym}
          sub={
            chain && (
              <div className="flex flex-col gap-2">
                <span>≈ {usd(toUsd(chain.credited))} at today&apos;s {sym} price</span>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-mint/10" aria-hidden="true">
                  <span className="h-full bg-teal" style={{ width: `${Math.max(paidShare * 100, paidShare > 0 ? 1.5 : 0)}%` }} />
                </div>
              </div>
            )
          }
        />
        <Figure
          kind="Paid"
          label="Paid out to holders"
          loading={loading}
          value={paid ? assetAmount(paid.amount) : chain ? assetAmount(chain.withdrawn) : UNAVAILABLE}
          unit={sym}
          sub={
            paid ? (
              <span>
                {usd(paid.usd)} at payout · {paid.holdersPaid ?? "—"} wallets · {paid.payouts ?? "—"} payouts
                {paid.lastAt && (
                  <>
                    <br />
                    Last {ago(paid.lastAt, now)}
                    {paid.lastTx && (
                      <>
                        {" · "}
                        <a
                          href={network.explorer.tx(paid.lastTx)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-mint underline-offset-4 hover:underline"
                        >
                          receipt
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      </>
                    )}
                  </>
                )}
              </span>
            ) : (
              "Payout receipts unavailable"
            )
          }
        />
        <Figure
          kind="Pending"
          label="Accrued, awaiting claim"
          loading={loading}
          value={chain ? assetAmount(chain.awaitingClaim) : UNAVAILABLE}
          unit={sym}
          sub={chain && <span>≈ {usd(toUsd(chain.awaitingClaim))} · credited on-chain, not yet paid out</span>}
        />
        <Figure
          kind={streamActive ? "Live" : "Pending"}
          label="Current stream"
          loading={loading}
          value={stream ? (streamActive ? assetAmount(stream.total - stream.released) : "Idle") : UNAVAILABLE}
          unit={streamActive ? sym : undefined}
          sub={
            stream &&
            (streamActive ? (
              <div className="flex flex-col gap-2">
                <span>Releasing over {Math.round(stream.periodSeconds / 60)} min, started {clockTime(stream.startedAt!)}</span>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-mint/10" aria-hidden="true">
                  <span className="block h-full bg-mint transition-[width] duration-500 ease-linear" style={{ width: `${Math.min(100, streamProgress * 100)}%` }} />
                </div>
              </div>
            ) : (
              <span>
                No stream running. Fees release in {Math.round(stream.periodSeconds / 60)}-minute windows
                {stream.startedAt ? `; the last began ${ago(stream.startedAt, now)}` : ""}.
              </span>
            ))
          }
        />
      </div>

      {/* Fee terms, drawn to scale: one pool fee, split three ways. */}
      <div className="flex flex-col gap-4 rounded-lg border border-mint/12 bg-ink-2/50 p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-paper/80">
            Where one pool fee goes
            {terms && <span className="text-muted-foreground"> · {amount(terms.poolFeeBps / 100)}% of every trade, fixed at launch</span>}
          </p>
          {terms && (
            <p className="tabular text-sm font-semibold text-teal">
              {amount(terms.holderFractionOfTrade * 100, 2)}% of each trade → holders
            </p>
          )}
        </div>
        {terms ? (
          (() => {
            const venue = terms.venueCut;
            const holders = (1 - venue) * (terms.holderShareBps / 10_000);
            const protocol = 1 - venue - holders;
            const parts = [
              { label: pool.venue, share: venue, cls: "bg-graphite" },
              { label: `${pool.launchpad} protocol`, share: protocol, cls: "bg-forest" },
              { label: "CPU holders", share: holders, cls: "bg-teal" },
            ];
            return (
              <>
                <div className="flex h-3 w-full overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${(p.share * 100).toFixed(1)}%`).join(", ")}>
                  {parts.map((p) => (
                    <span key={p.label} className={cn("h-full", p.cls)} style={{ width: `${p.share * 100}%` }} />
                  ))}
                </div>
                <ul className="grid gap-2 text-sm sm:grid-cols-3">
                  {parts.map((p) => (
                    <li key={p.label} className="flex items-center gap-2 text-paper/80">
                      <span className={cn("size-2.5 rounded-full", p.cls)} aria-hidden="true" />
                      {p.label}
                      <span className="tabular ml-auto text-paper sm:ml-0">{(p.share * 100).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            );
          })()
        ) : (
          <p className="text-sm text-muted-foreground">{loading ? "Reading fee terms…" : "Fee terms unavailable"}</p>
        )}
        <dl className="grid gap-x-8 gap-y-3 border-t border-mint/10 pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Minimum to qualify</dt>
            <dd className="tabular mt-0.5 text-paper">{chain ? `${amount(chain.minEligible, 0)} CPU` : UNAVAILABLE}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Eligible supply</dt>
            <dd className="tabular mt-0.5 text-paper">{chain ? `${compact(chain.eligibleSupply)} CPU` : UNAVAILABLE}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Burned</dt>
            <dd className="tabular mt-0.5 text-paper">{data?.supply.burned != null ? `${compact(data.supply.burned)} CPU` : UNAVAILABLE}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
