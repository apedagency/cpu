/**
 * Single source of truth for every project literal: names, links, addresses,
 * network metadata and upstream API endpoints. Components import from here —
 * nothing else in the codebase should hard-code a URL or an address.
 */

export const site = {
  name: "Cat Purrcessing Unit",
  shortName: "CPU",
  ticker: "CPU",
  domain: "https://catpurrcessingunit.com",
  /** Launch copy published with the token on Signal. */
  tagline: "$CPU makes the connection.",
  description:
    "Cat Purrcessing Unit ($CPU) is a HyperEVM token paired with NVIDIA through Signal. Its trading fees stream to holders in wNVDAx.",
} as const;

export const network = {
  name: "HyperEVM",
  chainId: 999,
  /**
   * Server-side only. Override with HYPEREVM_RPC_URL for a private endpoint.
   * `||`, not `??`: a blank value (e.g. copied from .env.example) must fall back.
   */
  rpcUrl: process.env.HYPEREVM_RPC_URL?.trim() || "https://rpc.hyperliquid.xyz/evm",
  explorer: {
    tx: (hash: string) => `https://hyperevmscan.io/tx/${hash}`,
    address: (addr: string) => `https://hyperevmscan.io/address/${addr}`,
  },
} as const;

export const token = {
  address: "0x612F8E85aae1Ab200Ab48b1420001502572e3595",
  symbol: "CPU",
  name: "Cat Purrcessing Unit",
  decimals: 18,
} as const;

export const pairedAsset = {
  name: "NVIDIA",
  /** The on-chain wrapper CPU is paired with and pays holders in. */
  wrapper: {
    address: "0xa8ddb5Cd96b5222AFe198316E9A57CAA642850D5",
    symbol: "wNVDAx",
    name: "Wrapped NVIDIA xStock",
    decimals: 18,
  },
} as const;

export const pool = {
  address: "0xc31650E8abAeA2C6B88A06C508AD7d545E66eFBA",
  venue: "Project X",
  launchpad: "Signal",
  /**
   * Share of every pool fee Project X keeps before Signal's pad collects the
   * rest (slot0().feeProtocol = 0x77). Documented at signal.family/docs.
   */
  venueFeeShare: 1 / 7,
} as const;

export const links = {
  x: "https://x.com/cpuhyperliquid",
  dexscreener:
    "https://dexscreener.com/hyperevm/0xc31650e8abaea2c6b88a06c508ad7d545e66efba",
  /** No public server yet. Set the invite URL here and the Discord links appear in the menu and footer. */
  discord: null as string | null,
  signal: `https://signal.family/t/${token.address.toLowerCase()}`,
  signalDocs: "https://signal.family/docs",
} as const;

export const upstream = {
  signal: "https://signal.family/api",
  dexscreener: "https://api.dexscreener.com",
  dexscreenerChain: "hyperevm",
  geckoterminal: "https://api.geckoterminal.com/api/v2",
  geckoNetwork: "hyperevm",
} as const;

/** Client polling cadence (ms). Server routes cache below these. */
export const refresh = {
  market: 30_000,
  rewards: 45_000,
  candles: 60_000,
} as const;

export const nav = [
  { id: "lore", label: "Lore" },
  { id: "compute", label: "Compute" },
  { id: "engine", label: "Engine" },
  { id: "gallery", label: "Gallery" },
  { id: "market", label: "Market" },
] as const;

export const shortAddress = (addr: string, lead = 6, tail = 4) =>
  `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
