"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLive, type Live } from "@/hooks/use-live";
import { refresh } from "@/lib/config";
import type { MarketSnapshot } from "@/lib/types";

const MarketContext = createContext<Live<MarketSnapshot> | null>(null);

/** One poll of /api/market shared by the hero and the Market section. */
export function MarketProvider({ children }: { children: ReactNode }) {
  const live = useLive<MarketSnapshot>("/api/market", refresh.market);
  return <MarketContext.Provider value={live}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used inside <MarketProvider>");
  return ctx;
}
