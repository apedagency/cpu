"use client";

import NumberFlow from "@number-flow/react";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { AmountReadout, AmountSlider } from "@/components/ui/amount-slider";
import { amount, assetAmount, compact, UNAVAILABLE, usd } from "@/lib/format";
import type { MarketSnapshot, RewardSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Log-spaced stops: CPU positions span orders of magnitude. */
const STOPS = [100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000];
const STOP_INDEXES = STOPS.map((_, i) => i);
const EXAMPLE_VOLUME = 10_000;
const MAX_INPUT = 1_000_000_000;

const parseAmount = (s: string) => {
  const n = Number(s.replace(/[,\s_]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, MAX_INPUT) : null;
};

/**
 * Amount mode answers three questions only: what is this position worth, does
 * it count for rewards, and what share of eligible supply is it. The fee
 * arithmetic stays behind "How rewards scale" — it is not a forecast.
 */
export function PositionCalculator({ market, rewards }: { market: MarketSnapshot | null; rewards: RewardSnapshot | null }) {
  const [cpu, setCpu] = useState(5_000_000);
  const [draft, setDraft] = useState("5,000,000");
  const inputId = useId();

  const setBoth = (n: number) => {
    setCpu(n);
    setDraft(amount(n, 0));
  };

  const priceUsd = market?.priceUsd ?? null;
  const payoutPx = rewards?.payout.priceUsd ?? null;
  const chain = rewards?.chain ?? null;
  const terms = rewards?.terms ?? null;
  const sym = rewards?.payout.symbol ?? "wNVDAx";

  const valueUsd = priceUsd !== null ? cpu * priceUsd : null;
  const valueNative = market?.priceNative != null ? cpu * market.priceNative : valueUsd !== null && payoutPx ? valueUsd / payoutPx : null;
  const eligible = chain ? cpu >= chain.minEligible : null;
  const share = chain && eligible ? Math.min(1, cpu / chain.eligibleSupply) : null;
  const perVolume = terms ? EXAMPLE_VOLUME * terms.holderFractionOfTrade : null;
  const slice = perVolume !== null && share !== null ? perVolume * share : null;

  const logCpu = Math.log(Math.max(cpu, 1));
  const sliderIndex = STOPS.reduce(
    (best, s, i) => (Math.abs(Math.log(s) - logCpu) < Math.abs(Math.log(STOPS[best]) - logCpu) ? i : best),
    0,
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <p className="flex items-baseline gap-3">
            <AmountReadout
              text={amount(cpu, 0)}
              label={`${amount(cpu, 0)} CPU`}
              className="text-[clamp(2.5rem,5.4vw,4.5rem)] leading-none tracking-[-0.03em] text-paper"
            />
            <span className="text-lg font-medium text-mint">CPU</span>
          </p>
          <label htmlFor={inputId} className="group flex items-baseline gap-2 text-xs text-paper/45">
            <span className="max-sm:sr-only">Exact</span>
            <input
              id={inputId}
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                const n = parseAmount(e.target.value);
                if (n !== null) setCpu(n);
              }}
              onBlur={() => setDraft(amount(cpu, 0))}
              aria-describedby={`${inputId}-hint`}
              className="tabular h-10 w-36 border-b border-paper/20 bg-transparent text-right text-base text-paper outline-none transition-[border-color,box-shadow] placeholder:text-paper/30 hover:border-paper/40 focus:border-teal focus-visible:shadow-[0_2px_0_var(--cpu-teal)]"
            />
            <span id={`${inputId}-hint`} className="sr-only">
              CPU amount, up to one billion
            </span>
          </label>
        </div>

        <AmountSlider
          min={0}
          max={STOPS.length - 1}
          stops={STOP_INDEXES}
          step={1}
          value={[sliderIndex]}
          onValueChange={([i]) => i !== undefined && STOPS[i] !== undefined && setBoth(STOPS[i])}
          aria-label="CPU amount"
          aria-valuetext={`${amount(cpu, 0)} CPU`}
        />
        <div className="relative h-4 text-[0.6875rem] tabular-nums text-paper/40" aria-hidden="true">
          {STOPS.map((s, i) =>
            i === 0 || i === STOPS.length - 1 || s === 1_000_000 ? (
              <span
                key={s}
                className={cn("absolute top-0 -translate-x-1/2 whitespace-nowrap", i === 0 && "translate-x-0", i === STOPS.length - 1 && "-translate-x-full", s === 1_000_000 && "text-mint/70")}
                style={{ left: `calc(${i / (STOPS.length - 1)} * (100% - 24px) + 12px)` }}
              >
                {compact(s)}
                {s === 1_000_000 && " minimum"}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-paper/55">Worth today</dt>
          <dd className="tabular mt-1.5 text-[clamp(1.75rem,2.6vw,2.25rem)] font-semibold leading-none tracking-[-0.02em] text-paper">
            {valueUsd !== null ? <NumberFlow value={valueUsd} format={{ style: "currency", currency: "USD", maximumFractionDigits: valueUsd >= 100 ? 0 : 2 }} /> : UNAVAILABLE}
          </dd>
          {valueNative !== null && <dd className="tabular mt-1.5 text-xs text-paper/45">{assetAmount(valueNative)} {sym}</dd>}
        </div>
        <div>
          <dt className="text-sm text-paper/55">Counts for rewards</dt>
          <dd className={cn("mt-1.5 text-[clamp(1.75rem,2.6vw,2.25rem)] font-semibold leading-none tracking-[-0.02em]", eligible ? "text-teal" : "text-paper/70")}>
            {eligible === null ? UNAVAILABLE : eligible ? "Yes" : "Not yet"}
          </dd>
          {chain && (
            <dd className="mt-1.5 text-xs text-paper/45">
              {eligible ? "Holds at least" : "Needs"} {amount(chain.minEligible, 0)} CPU
            </dd>
          )}
        </div>
        <div>
          <dt className="text-sm text-paper/55">Share of eligible supply</dt>
          <dd className="tabular mt-1.5 text-[clamp(1.75rem,2.6vw,2.25rem)] font-semibold leading-none tracking-[-0.02em] text-paper">
            {share !== null ? (
              <NumberFlow value={share} format={{ style: "percent", maximumFractionDigits: share < 0.001 ? 4 : 3, minimumFractionDigits: 2 }} />
            ) : eligible === false ? (
              "—"
            ) : (
              UNAVAILABLE
            )}
          </dd>
          {chain && <dd className="tabular mt-1.5 text-xs text-paper/45">of {compact(chain.eligibleSupply)} CPU counted today</dd>}
        </div>
      </dl>

      <details className="group text-sm text-paper/55">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-medium text-paper/60 transition-colors hover:text-paper [&::-webkit-details-marker]:hidden">
          How rewards scale
          <ChevronDown className="size-4 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <p className="max-w-2xl pb-2 leading-relaxed">
          Holders share {terms ? `${amount(terms.holderFractionOfTrade * 100, 2)}%` : "a fixed part"} of every trade&apos;s value, paid in {sym} and split by
          balance.{" "}
          {slice !== null && perVolume !== null ? (
            <>
              At this share, every {usd(EXAMPLE_VOLUME, "whole")} traded sends {usd(perVolume)} to all holders, and {usd(slice)} of it to a wallet this size.{" "}
            </>
          ) : null}
          That is arithmetic on the fixed terms and today&apos;s eligible supply, not a forecast — what arrives depends on real volume and when
          payouts are pushed or claimed.
        </p>
      </details>
    </div>
  );
}
