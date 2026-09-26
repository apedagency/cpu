"use client";

import { ArrowUpRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import { links, network, shortAddress } from "@/lib/config";
import { amount, assetAmount, usd } from "@/lib/format";
import type { Envelope, HolderPosition, RewardSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "error" }
  | { kind: "ready"; data: HolderPosition };

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** Wallet mode: paste an address, read the contract, show what it holds and what it's owed. */
export function HolderLookup({ rewards }: { rewards: RewardSnapshot | null }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const ctrl = useRef<AbortController | null>(null);
  const id = useId();

  const sym = rewards?.payout.symbol ?? "wNVDAx";
  const px = rewards?.payout.priceUsd ?? null;
  const eligibleSupply = rewards?.chain?.eligibleSupply ?? null;
  const minEligible = rewards?.chain?.minEligible ?? null;
  const toUsd = (v: number) => (px === null ? null : v * px);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = value.trim();
    if (!ADDRESS.test(address)) {
      setState({ kind: "invalid" });
      return;
    }
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/holder?address=${address}`, { signal: c.signal });
      const body = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as Envelope<HolderPosition> | { error: string };
      if (!res.ok || "error" in body) throw new Error("error" in body ? body.error : `HTTP ${res.status}`);
      setState({ kind: "ready", data: body.data });
    } catch {
      if (c.signal.aborted) return;
      setState({ kind: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={lookup} noValidate className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm text-paper/55">
          Paste any HyperEVM address — read-only, no wallet connection
        </label>
        <div className="flex items-end gap-3">
          <input
            id={id}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (state.kind === "invalid") setState({ kind: "idle" });
            }}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={state.kind === "invalid"}
            aria-describedby={`${id}-status`}
            className={cn(
              "h-12 min-w-0 flex-1 border-b border-paper/20 bg-transparent font-mono text-[clamp(0.8125rem,1.4vw,1rem)] text-paper outline-none transition-[border-color,box-shadow] placeholder:text-paper/25 hover:border-paper/40 focus:border-teal focus-visible:shadow-[0_2px_0_var(--cpu-teal)]",
              state.kind === "invalid" && "border-fog",
            )}
          />
          <button
            type="submit"
            disabled={state.kind === "loading"}
            className="inline-flex h-11 shrink-0 items-center rounded-xs bg-teal px-5 text-sm font-semibold text-ink-1 transition-[background-color,box-shadow] hover:bg-mint hover:shadow-[0_0_28px_-6px_var(--cpu-teal)] disabled:opacity-60"
          >
            {state.kind === "loading" ? "Reading…" : "Read"}
          </button>
        </div>
      </form>

      <div id={`${id}-status`} aria-live="polite" className="min-h-24">
        {state.kind === "idle" && <p className="text-sm text-paper/35">Balance, eligibility and what the contract owes this wallet.</p>}
        {state.kind === "invalid" && <p className="text-sm text-fog">That isn&apos;t a 0x address with 40 hex characters.</p>}
        {state.kind === "loading" && (
          <div className="grid gap-6 sm:grid-cols-3" aria-label="Reading the contract">
            {[0, 1, 2].map((i) => (
              <span key={i} className="skeleton h-14 rounded-xs" />
            ))}
          </div>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-fog" role="alert">
            The contract read didn&apos;t answer. Nothing is shown rather than a guess — try again in a moment.
          </p>
        )}
        {state.kind === "ready" && (
          <div className="flex flex-col gap-7">
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="tabular text-[clamp(1.75rem,2.6vw,2.25rem)] font-semibold leading-none tracking-[-0.02em] text-paper">
                {amount(state.data.balance, 0)} <span className="text-base font-medium text-mint">CPU</span>
              </span>
              <span className={cn("text-sm font-medium", state.data.eligible ? "text-teal" : "text-paper/55")}>
                {state.data.eligible
                  ? `Counts for rewards${eligibleSupply ? ` · ${((state.data.balance / eligibleSupply) * 100).toFixed(3)}% of eligible supply` : ""}`
                  : `Below the ${minEligible ? amount(minEligible, 0) : ""} CPU minimum`}
              </span>
              <a
                href={network.explorer.address(state.data.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-paper/45 underline-offset-4 hover:text-paper hover:underline"
              >
                {shortAddress(state.data.address)}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </p>
            <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-3">
              {[
                { k: "Claimable now", v: state.data.claimable, lead: true },
                { k: "Paid to this wallet", v: state.data.paid },
                { k: "Earned in total", v: state.data.earned },
              ].map((f) => (
                <div key={f.k}>
                  <dt className="text-sm text-paper/55">{f.k}</dt>
                  <dd className={cn("tabular mt-1.5 font-semibold leading-none tracking-[-0.02em]", f.lead ? "text-[clamp(1.75rem,2.6vw,2.25rem)] text-paper" : "text-xl text-paper/85")}>
                    {assetAmount(f.v)} <span className="text-sm font-medium text-mint/70">{sym}</span>
                  </dd>
                  <dd className="tabular mt-1.5 text-xs text-paper/45">{f.v > 0 ? `≈ ${usd(toUsd(f.v))}` : "—"}</dd>
                </div>
              ))}
            </dl>
            {state.data.claimable > 0 && (
              <a
                href={links.signal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-sm font-medium text-mint underline-offset-4 hover:underline"
              >
                Claim on Signal
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
