"use client";

import NumberFlow from "@number-flow/react";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { Live } from "@/hooks/use-live";
import { network } from "@/lib/config";
import { ago, assetAmount, UNAVAILABLE, usd } from "@/lib/format";
import type { RewardSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Payout amounts are tiny; four significant figures keep them truthful. */
const ASSET = { maximumSignificantDigits: 4, minimumSignificantDigits: 2 } as const;

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Level 1 — the machine. One number carries the section: what the fee flow
 * has credited to holders. Its split (paid out vs waiting to be claimed) and
 * the live stream sit beside it. Everything is read, nothing is projected.
 */
export function Machine({ live }: { live: Live<RewardSnapshot> }) {
  const { status, data, stale, fetchedAt } = live;
  const now = useNow(1000);
  const sym = data?.payout.symbol ?? "wNVDAx";
  const px = data?.payout.priceUsd ?? null;
  const chain = data?.chain ?? null;
  const paid = data?.paid ?? null;
  const toUsd = (v: number | null | undefined) => (v == null || px === null ? null : v * px);

  const stream = chain?.stream;
  const streamEnd = stream?.startedAt ? stream.startedAt + stream.periodSeconds * 1000 : null;
  const streaming = !!(stream && streamEnd && now < streamEnd && stream.total > stream.released);
  const progress = streaming && stream?.startedAt ? Math.min(1, (now - stream.startedAt) / (stream.periodSeconds * 1000)) : 0;
  const paidAmount = paid?.amount ?? chain?.withdrawn ?? null;
  const paidShare = chain && chain.credited > 0 ? (chain.withdrawn / chain.credited) : 0;

  if (status === "error") {
    return (
      <div role="alert" className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-10">
        <p className="text-2xl font-semibold text-paper">Reward data is unavailable right now.</p>
        <p className="text-sm text-muted-foreground">Signal and the HyperEVM RPC did not answer — figures are hidden rather than guessed.</p>
        <button type="button" onClick={live.refresh} className="text-sm font-medium text-mint underline-offset-4 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const loading = status === "loading";

  return (
    <div className="grid gap-x-[clamp(2rem,6vw,7rem)] gap-y-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)] lg:items-end">
      <div className="min-w-0">
        <p className="text-sm text-paper/60">Credited to CPU holders so far</p>
        {loading ? (
          <span className="skeleton mt-4 block h-[clamp(3.5rem,9vw,8rem)] w-[min(100%,34rem)] rounded-xs" aria-label="Reading the contract" />
        ) : (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-4 leading-none">
            <span className="tabular text-[clamp(3.75rem,10.5vw,9.5rem)] font-semibold tracking-[-0.045em] text-paper [font-variation-settings:'wdth'_100,'opsz'_144]">
              {chain ? <NumberFlow value={chain.credited} format={ASSET} /> : UNAVAILABLE}
            </span>
            <span className="text-[clamp(1.25rem,2.2vw,2rem)] font-medium text-mint">{sym}</span>
          </p>
        )}
        <p className="mt-4 text-sm text-paper/55">
          {chain && px !== null ? <>≈ {usd(toUsd(chain.credited))} at today&apos;s {sym} price</> : " "}
        </p>

        {/* Paid vs waiting: one bar, drawn to scale. */}
        <div className="mt-10 max-w-2xl">
          <div className="flex h-1 w-full overflow-hidden bg-mint/12" aria-hidden="true">
            <span className="h-full bg-teal shadow-[0_0_12px_var(--cpu-teal)]" style={{ width: `${Math.max(paidShare * 100, paidShare > 0 ? 0.8 : 0)}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div>
              <dt className="flex items-center gap-2 text-paper/55">
                <span className="size-1.5 bg-teal" aria-hidden="true" />
                Paid out
              </dt>
              <dd className="tabular mt-1 text-lg font-semibold text-paper">
                {paidAmount !== null ? assetAmount(paidAmount) : UNAVAILABLE} <span className="text-sm font-medium text-mint/70">{sym}</span>
              </dd>
              {paid && (
                <dd className="text-xs text-paper/45">
                  {paid.payouts ?? "—"} payouts · {paid.holdersPaid ?? "—"} wallets
                  {paid.lastAt && <> · last {ago(paid.lastAt, now)}</>}
                  {paid.lastTx && (
                    <>
                      {" · "}
                      <a href={network.explorer.tx(paid.lastTx)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-mint/80 underline-offset-4 hover:text-mint hover:underline">
                        receipt
                        <ArrowUpRight className="size-3" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </>
                  )}
                </dd>
              )}
            </div>
            <div>
              <dt className="flex items-center gap-2 text-paper/55">
                <span className="size-1.5 bg-mint/30" aria-hidden="true" />
                Waiting to be claimed
              </dt>
              <dd className="tabular mt-1 text-lg font-semibold text-paper">
                {chain ? assetAmount(chain.awaitingClaim) : UNAVAILABLE} <span className="text-sm font-medium text-mint/70">{sym}</span>
              </dd>
              {chain && px !== null && <dd className="text-xs text-paper/45">≈ {usd(toUsd(chain.awaitingClaim))}</dd>}
            </div>
          </dl>
        </div>
      </div>

      {/* The live stream: the one thing on this page that moves by itself. */}
      <div className="min-w-0 lg:pb-2">
        {/* Only the state change is announced; the countdown ticks every second. */}
        <p className="flex items-center gap-2 text-sm text-paper/60" aria-live="polite">
          <span className={cn("relative size-2 rounded-full", streaming ? "bg-teal" : "bg-paper/25")} aria-hidden="true">
            {streaming && <span className="absolute inset-0 animate-ping rounded-full bg-teal/70" />}
          </span>
          {loading ? "Reading the stream…" : streaming ? "Streaming to holders now" : "Stream idle"}
        </p>
        {!loading && stream && (
          streaming ? (
            <>
              <p className="tabular mt-3 text-[clamp(2rem,3.4vw,3rem)] font-semibold leading-none tracking-[-0.03em] text-paper">
                <NumberFlow value={stream.total - stream.released} format={ASSET} />{" "}
                <span className="text-base font-medium text-mint">{sym}</span>
              </p>
              <div className="mt-5 h-px w-full bg-mint/15" aria-hidden="true">
                <div className="h-px bg-mint shadow-[0_0_10px_var(--cpu-mint)] transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-3 flex justify-between text-xs text-paper/45">
                <span>{Math.round(stream.periodSeconds / 60)}-minute release window</span>
                <span className="tabular text-paper/70">{streamEnd ? clock(streamEnd - now) : ""} left</span>
              </p>
            </>
          ) : (
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-paper/50">
              Fees release to holders in {Math.round(stream.periodSeconds / 60)}-minute windows
              {stream.startedAt ? <> — the last opened {ago(stream.startedAt, now)}</> : null}.
            </p>
          )
        )}
        <p className="mt-8 text-[0.6875rem] uppercase tracking-[0.14em] text-paper/35">
          {loading ? "HyperEVM · Signal" : stale ? `Delayed · last read ${ago(fetchedAt, now)}` : `Read ${ago(fetchedAt, now)} · ${sym} ${usd(px)}`}
        </p>
      </div>
    </div>
  );
}
