import { network, token } from "@/lib/config";
import { remember, UpstreamError } from "./http";

/**
 * Read-only calls against the CPU token, which is its own dividend
 * distributor (a Signal pays-holders launch). Selectors were resolved from
 * the deployed implementation's bytecode.
 */
const SEL = {
  eligibleSupply: "0x6ade07b0",
  minEligible: "0x18a89fe1", // MIN_ELIGIBLE()
  totalCredited: "0x067b23c3",
  totalWithdrawn: "0x4b319713",
  streamTotal: "0xa919855b",
  streamReleased: "0x3c06a7ab",
  streamStart: "0xdc9db7f1",
  distributionPeriod: "0xb092deb1", // DISTRIBUTION_PERIOD()
  balanceOf: "0x70a08231",
  withdrawable: "0xa8b9d240", // withdrawableDividendOf(address)
  withdrawn: "0x6ef61092", // withdrawn(address)
  accumulative: "0x27ce0147", // accumulativeDividendOf(address)
} as const;

type RpcReply = { id: number; result?: string; error?: { message?: string } };

async function batchCall(calls: { to: string; data: string }[]): Promise<bigint[]> {
  let res: Response;
  try {
    res = await fetch(network.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        calls.map((c, id) => ({
          jsonrpc: "2.0",
          id,
          method: "eth_call",
          params: [{ to: c.to, data: c.data }, "latest"],
        })),
      ),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    throw new UpstreamError("hyperevm", err instanceof Error ? err.message : "request failed");
  }
  if (!res.ok) throw new UpstreamError("hyperevm", `HTTP ${res.status}`);
  const replies = (await res.json()) as RpcReply[];
  if (!Array.isArray(replies)) throw new UpstreamError("hyperevm", "unexpected reply");

  return calls.map((_, id) => {
    const r = replies.find((x) => x.id === id);
    if (!r || r.error || typeof r.result !== "string" || !/^0x[0-9a-f]*$/i.test(r.result)) {
      throw new UpstreamError("hyperevm", r?.error?.message ?? `call ${id} failed`);
    }
    return r.result === "0x" ? 0n : BigInt(r.result.slice(0, 66));
  });
}

const WAD = 10n ** 18n;
/** 18-decimal fixed point → JS number, keeping ~12 significant decimals. */
export const fromWad = (v: bigint) => Number(v / WAD) + Number(v % WAD) / 1e18;

const padAddress = (addr: string) => addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");

export interface DividendState {
  eligibleSupply: number;
  minEligible: number;
  credited: number;
  withdrawn: number;
  streamTotal: number;
  streamReleased: number;
  streamStart: number;
  distributionPeriod: number;
  readAt: number;
}

export function readDividendState(): Promise<DividendState> {
  return remember("dividend-state", 20_000, async () => {
    const keys = [
      "eligibleSupply",
      "minEligible",
      "totalCredited",
      "totalWithdrawn",
      "streamTotal",
      "streamReleased",
      "streamStart",
      "distributionPeriod",
    ] as const;
    const v = await batchCall(keys.map((k) => ({ to: token.address, data: SEL[k] })));
    return {
      eligibleSupply: fromWad(v[0]),
      minEligible: fromWad(v[1]),
      credited: fromWad(v[2]),
      withdrawn: fromWad(v[3]),
      streamTotal: fromWad(v[4]),
      streamReleased: fromWad(v[5]),
      streamStart: Number(v[6]),
      distributionPeriod: Number(v[7]),
      readAt: Date.now(),
    };
  });
}

export interface HolderReads {
  balance: number;
  claimable: number;
  paid: number;
  earned: number;
  readAt: number;
}

export function readHolder(address: string): Promise<HolderReads> {
  const a = padAddress(address);
  return remember(`holder:${a}`, 15_000, async () => {
    const v = await batchCall([
      { to: token.address, data: SEL.balanceOf + a },
      { to: token.address, data: SEL.withdrawable + a },
      { to: token.address, data: SEL.withdrawn + a },
      { to: token.address, data: SEL.accumulative + a },
    ]);
    return {
      balance: fromWad(v[0]),
      claimable: fromWad(v[1]),
      paid: fromWad(v[2]),
      earned: fromWad(v[3]),
      readAt: Date.now(),
    };
  });
}
