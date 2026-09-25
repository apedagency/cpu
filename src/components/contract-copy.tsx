"use client";

import { Check, Copy } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { shortAddress, token } from "@/lib/config";
import { cn } from "@/lib/utils";

interface ContractCopyProps {
  variant?: "chip" | "full" | "plain" | "plain-full";
  className?: string;
  label?: string;
}

/**
 * Click / tap copies the CPU contract. The short form keeps the address from
 * dominating layouts; `full` shows the whole thing where there is room.
 */
export function ContractCopy({ variant = "chip", className, label = "CA" }: ContractCopyProps) {
  const { copy, copied, failed } = useCopy();
  const shown = variant === "full" ? token.address : shortAddress(token.address);
  const plain = variant === "plain" || variant === "plain-full";

  return (
    <button
      type="button"
      onClick={() => void copy(token.address)}
      className={cn(
        plain
          ? "group relative inline-flex min-h-11 max-w-full items-center gap-2 bg-transparent p-0 text-left text-paper/58 transition-colors duration-300 hover:text-mint"
          : "group relative inline-flex min-h-11 max-w-full items-center gap-3 rounded-md border border-mint/20 bg-ink-1/70 px-3 text-left text-paper backdrop-blur-sm transition-[border-color,background-color] duration-300 hover:border-teal/60 hover:bg-visor",
        copied && (plain ? "text-teal" : "border-teal/80"),
        className,
      )}
      aria-label={`Copy ${token.symbol} contract address ${token.address}`}
    >
      {!plain && <span className="type-label shrink-0 text-mint/70">{label}</span>}
      {variant === "plain" ? (
        <>
          <span className="font-mono text-[0.6875rem] tracking-[-0.025em] xl:hidden">{shortAddress(token.address)}</span>
          <span className="hidden font-mono text-[0.6875rem] tracking-[-0.025em] xl:inline">{token.address}</span>
        </>
      ) : (
        <span
          className={cn(
            "min-w-0 font-mono text-[0.8125rem] tracking-tight",
            variant === "full" || variant === "plain-full" ? "break-all whitespace-normal" : "truncate",
          )}
        >
          {variant === "plain-full" ? token.address : shown}
        </span>
      )}
      <span className="relative ml-auto grid size-4 shrink-0 place-items-center" aria-hidden="true">
        <Copy
          className={cn(
            "size-4 text-mint/70 transition-[color,opacity,transform] duration-300 group-hover:text-teal",
            plain && "size-3.5 opacity-60",
            copied && "scale-50 opacity-0",
          )}
        />
        <Check
          className={cn(
            "absolute size-4 text-teal opacity-0 transition-opacity duration-300",
            copied && "opacity-100",
          )}
        />
      </span>
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute -top-6 right-0 whitespace-nowrap text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-teal opacity-0 transition-[background-color,opacity,transform] duration-300",
          !plain && "rounded bg-teal px-2 py-1 text-ink-1",
          (copied || failed) && "-translate-y-0.5 opacity-100",
          failed && "bg-fog",
        )}
      >
        {copied ? "Contract copied" : failed ? "Copy blocked — select the address" : ""}
      </span>
    </button>
  );
}
