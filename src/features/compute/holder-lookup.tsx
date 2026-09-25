"use client";

import { ArrowUpRight, Search } from "lucide-react";
import { useId, useRef, useState } from "react";
import { links, network, shortAddress } from "@/lib/config";
import { amount, assetAmount, usd } from "@/lib/format";
import type { Envelope, HolderPosition, RewardSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: HolderPosition };

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function HolderLookup({ rewards }: { rewards: RewardSnapshot | null }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const ctrl = useRef<AbortController | null>(null);
  const id = useId();

  const sym = rewards?.payout.symbol ?? "wNVDAx";
  const px = rewards?.payout.priceUsd ?? null;
  const eligibleSupply = rewards?.chain?.eligibleSupply ?? null;
  const minEligible = rewards?.chain?.minEligible ?? null;

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
      const body = (await res.json()) as Envelope<HolderPosition> | { error: string };
      if (!res.ok || "error" in body) throw new Error("error" in body ? body.error : `HTTP ${res.status}`);
      setState({ kind: "ready", data: body.data });
    } catch (err) {
      if (c.signal.aborted) return;
      setState({ kind: "error", message: err instanceof Error ? err.message : "Lookup failed" });
    }
  };

  const toUsd = (v: number) => (px === null ? null : v * px);

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={lookup} className="flex flex-col gap-2" noValidate>
        <label htmlFor={id} className="text-sm text-paper/80">
          Check a wallet
          <span className="block text-xs text-muted-foreground">Read-only. Paste any HyperEVM address — no wallet connection.</span>
        </label>
        <div className="flex gap-2">
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
              "h-11 min-w-0 flex-1 rounded-md border border-mint/20 bg-ink-1 px-3 font-mono text-sm text-paper outline-none transition-colors placeholder:text-paper/30 focus:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
              state.kind === "invalid" && "border-fog",
            )}
          />
          <button
            type="submit"
            disabled={state.kind === "loading"}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-teal px-4 text-sm font-semibold text-ink-1 transition-colors hover:bg-mint disabled:opacity-60"
          >
            <Search className="size-4" aria-hidden="true" />
            Read
          </button>
        </div>
      </form>

      <div id={`${id}-status`} aria-live="polite" className="min-h-6">
        {state.kind === "invalid" && <p className="text-sm text-fog">That isn&apos;t a 0x address with 40 hex characters.</p>}
        {state.kind === "loading" && (
          <div className="grid gap-3 sm:grid-cols-3" aria-label="Reading the contract">
            {[0, 1, 2].map((i) => (
              <span key={i} className="skeleton h-16 rounded-md" />
            ))}
          </div>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-fog" role="alert">
            The contract read failed ({state.message}). Nothing is shown rather than a guess — try again.
          </p>
        )}
        {state.kind === "ready" && (
          <div className="flex flex-col gap-4">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <a
                href={network.explorer.address(state.data.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-paper underline-offset-4 hover:underline"
              >
                {shortAddress(state.data.address)}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <span>
                {amount(state.data.balance, 0)} CPU
                {eligibleSupply && state.data.eligible && (
                  <> · {((state.data.balance / eligibleSupply) * 100).toFixed(3)}% of eligible supply</>
                )}
              </span>
              <span className={cn("type-label", state.data.eligible ? "text-teal" : "text-fog")}>
                {state.data.eligible ? "Counts for rewards" : `Below ${minEligible ? amount(minEligible, 0) : "the"} minimum`}
              </span>
            </p>
            <dl className="grid gap-px overflow-hidden rounded-md border border-mint/12 bg-mint/10 sm:grid-cols-3">
              {[
                { k: "Paid to this wallet", tag: "Paid", v: state.data.paid },
                { k: "Claimable now", tag: "Pending", v: state.data.claimable },
                { k: "Total earned", tag: "Historical", v: state.data.earned },
              ].map((f) => (
                <div key={f.k} className="flex flex-col gap-1 bg-ink-1 p-4">
                  <dt className="text-xs text-muted-foreground">
                    <span className="mr-1.5 font-semibold uppercase tracking-[0.12em] text-mint/80">{f.tag}</span>
                    {f.k}
                  </dt>
                  <dd className="tabular text-xl font-semibold text-paper">
                    {assetAmount(f.v)} <span className="text-sm font-medium text-mint/80">{sym}</span>
                  </dd>
                  <dd className="tabular text-xs text-muted-foreground">{f.v > 0 ? `≈ ${usd(toUsd(f.v))}` : "—"}</dd>
                </div>
              ))}
            </dl>
            {state.data.claimable > 0 && (
              <a
                href={links.signal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-sm text-mint underline-offset-4 hover:underline"
              >
                Claims are made on Signal
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
