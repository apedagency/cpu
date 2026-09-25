"use client";

import { useId, useState } from "react";
import { AmountReadout, AmountSlider } from "@/components/ui/amount-slider";
import type { MarketSnapshot, RewardSnapshot } from "@/lib/types";
import { amount, assetAmount, compact, UNAVAILABLE, usd } from "@/lib/format";
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

function Row({ label, value, note, emphasis }: { label: string; value: string; note?: string; emphasis?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-mint/10 py-4">
      <dt className="text-sm text-paper/75">
        {label}
        {note && <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span>}
      </dt>
      <dd className={cn("tabular text-right text-lg font-semibold text-paper", emphasis && "text-teal")}>{value}</dd>
    </div>
  );
}

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
  const yourSlice = perVolume !== null && share !== null ? perVolume * share : null;

  // The slider runs in stop-index space so log-spaced amounts sit evenly on
  // the track; a typed value between stops keeps its exact amount.
  const logCpu = Math.log(Math.max(cpu, 1));
  const sliderIndex = STOPS.reduce(
    (best, s, i) => (Math.abs(Math.log(s) - logCpu) < Math.abs(Math.log(STOPS[best]) - logCpu) ? i : best),
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="type-label mb-2">Position</p>
            <AmountReadout
              text={amount(cpu, 0)}
              label={`${amount(cpu, 0)} CPU`}
              className="text-[clamp(2.25rem,5vw,3.75rem)] leading-none tracking-[-0.02em]"
            />
            <span className="ml-2 text-lg font-medium text-mint">CPU</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-xs text-muted-foreground">
              Exact amount
            </label>
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
              className="tabular h-11 w-44 rounded-md border border-mint/20 bg-ink-1 px-3 text-right text-paper outline-none transition-colors placeholder:text-paper/30 focus:border-teal"
              aria-describedby={`${inputId}-hint`}
            />
            <span id={`${inputId}-hint`} className="sr-only">
              CPU amount, up to one billion
            </span>
          </div>
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
        <div className="relative h-4 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
          {STOPS.map((s, i) =>
            i === 0 || i === STOPS.length - 1 || s === 1_000_000 ? (
              <span
                key={s}
                className={cn("absolute top-0 -translate-x-1/2 whitespace-nowrap", i === 0 && "translate-x-0", i === STOPS.length - 1 && "-translate-x-full")}
                style={{ left: `calc(${i / (STOPS.length - 1)} * (100% - 24px) + 12px)` }}
              >
                {compact(s)}
                {s === 1_000_000 && " min."}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <dl>
        <Row label="Position value" value={usd(valueUsd)} note={valueNative !== null ? `${assetAmount(valueNative)} ${sym}` : undefined} />
        <Row
          label="Reward eligibility"
          value={eligible === null ? UNAVAILABLE : eligible ? "Counts" : "Below minimum"}
          note={chain ? `Wallets need at least ${amount(chain.minEligible, 0)} CPU` : undefined}
          emphasis={eligible === true}
        />
        <Row
          label="Share of eligible supply"
          value={share === null ? (eligible === false ? "Not counted" : UNAVAILABLE) : `${(share * 100).toFixed(share < 0.001 ? 4 : 3)}%`}
          note="Against today's eligible supply"
        />
        <Row
          label={`Holder fees per ${usd(EXAMPLE_VOLUME, "whole")} traded`}
          value={perVolume === null ? UNAVAILABLE : usd(perVolume)}
          note={`Paid to all holders in ${sym}`}
        />
        <Row
          label="Your slice of that"
          value={yourSlice === null ? (eligible === false ? "Not counted" : UNAVAILABLE) : usd(yourSlice)}
          emphasis={yourSlice !== null}
        />
      </dl>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Arithmetic from the token&apos;s fixed fee terms and today&apos;s price and eligible supply — not a forecast. What holders
        actually receive depends on real trading volume, balances and when payouts are pushed or claimed.
      </p>
    </div>
  );
}
