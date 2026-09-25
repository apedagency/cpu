# Cat Purrcessing Unit — catpurrcessingunit.com

Project site for **$CPU**, a HyperEVM token launched on Signal and paired with NVIDIA
(wNVDAx, Wrapped NVIDIA xStock). Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run lint
```

No environment variables are required. See `.env.example` for the optional
`HYPEREVM_RPC_URL` (private RPC for the on-chain reward reads).

## Where things live

| Path | What |
| --- | --- |
| `src/lib/config.ts` | **Every** project literal: name, ticker, domain, contract, pool, links (X / Dexscreener / Discord), network, upstream API bases, polling cadence. Change the Discord invite here. |
| `src/lib/api/*` | Server-side upstream adapters (Signal, Dexscreener, GeckoTerminal, HyperEVM RPC) → normalised types in `src/lib/types.ts`. |
| `src/app/api/*` | Our JSON routes: `market`, `rewards`, `candles?range=1H\|6H\|24H\|7D\|ALL`, `holder?address=0x…`. CDN-cacheable; upstreams are cached server-side. |
| `src/features/*` | Page sections: loader, nav, hero, lore, compute, engine (PFP), gallery, market, footer. |
| `src/components/ui/*` | 21st.dev community components, adapted (see credits). |
| `public/art`, `public/pfp`, `public/brand` | Optimised artwork, PFP layers, brand marks. |
| `assets/` | Source files as supplied (+ official logo files in `assets/brand-official`). Not served. |

## Live data

| Figure | Source | Notes |
| --- | --- | --- |
| Price, market cap, liquidity, 24h volume, trades, change | Dexscreener pair API → Signal `/api/token` fallback | Field-by-field fallback. |
| Paid to holders (amount, USD at payout, wallets, payouts, last receipt) | Signal `/api/token` (`paid_to_holders`, from chain receipts) | Matches `totalWithdrawn()` on chain. |
| Credited / awaiting claim / current stream / eligible supply / minimum | CPU contract on HyperEVM (`totalCredited`, `totalWithdrawn`, `stream*`, `eligibleSupply`, `MIN_ELIGIBLE`) | One batched `eth_call`. |
| Fee terms (1% pool fee, 70% to holders) | Signal `/api/token` (`fee_bps`, `creator_bps`, `creator_fees`) | Project X's 1/7 venue share is a documented venue constant in config. |
| wNVDAx price | Signal `/api/token/<wNVDAx>` | |
| Per-wallet paid / claimable / earned | CPU contract (`withdrawn`, `withdrawableDividendOf`, `accumulativeDividendOf`, `balanceOf`) | Read-only; no wallet connection. |
| Price history | GeckoTerminal minute OHLCV (1H/6H/24H) · Signal hourly candles (7D/ALL) | Only buckets that traded are plotted; gaps are real. |

Paid, pending and historical figures are labelled and never mixed. There is no APY, no projection,
and a failed source renders **Unavailable** — never 0 — while stale data is flagged.

## PFP Engine layers

The generator composes layers in a fixed order on a canvas (`src/features/engine/compose.ts`); the
preview and the 2048 × 2048 PNG export use the same code path. Layers are registered in
`src/features/engine/manifest.ts`:

- `public/pfp/base/` — character bases (bust, hero, stance). Transparent WebP.
- `public/pfp/backgrounds/` — image backgrounds (banner environment crops). Solid, radial and dot
  backgrounds are drawn procedurally in the brand palette.
- `public/pfp/accessories/` — **empty**: no accessory art has been supplied. The category is hidden
  in the UI until entries are added to `manifest.accessories`.
- `public/pfp/effects/` — reserved; light (glow / shade) is procedural today.

To add art: drop a transparent PNG/WebP at the canvas's intended scale into the right folder, add an
entry to the manifest with its pixel size, and (for accessories) extend `drawPfp` with its slot in
the layer order. Missing files are skipped and reported in the UI instead of breaking the export.

## Artwork pipeline

All character art comes from the supplied files (`assets/cpu-character.png`, the banner frames) and
the project's official listing images (Dexscreener portrait, Signal launch head). Renders were
cropped from the character sheet, upscaled 4× locally with Real-ESRGAN (anime model), and cut out
with BiRefNet — no new character art was generated. Logos are the official files: Hyperliquid brand
kit, NVIDIA (svgl), X and Discord (Simple Icons).

## 21st.dev components

| Component | Author | Used for | Adaptation |
| --- | --- | --- | --- |
| Dot Transition | hyperiux | Loader (Hyperliquid mark → CPU silhouette) | Play-once mode gated on real asset readiness; session-only; skipped for reduced motion. |
| Immersive Full Screen Navigation | hyperiux | Navbar + menu | Dark header, `inert` closed panel, context API, interruptible toggle. |
| Halftone Dots · LED screen | paper-design (Paper Shaders, Apache-2.0) | Hero environment | Recipe as props, CPU palette, cursor ripple on fine pointers only, still frame for reduced motion. |
| Variable Text Proximity | hyperiux | Lore statement | Self-hosted Roboto Flex, runs only in view. |
| Sticky Content Wrapper | hyperiux | Lore story | Snap removed, per-step dwell, screen-reader copy. |
| Amount Slider | serafimcloud | Compute position, Engine zoom | Stop-index (log) mapping, formatted rolling readout. |
| Segmented Control | ddoemonn | Engine options | CSS spring instead of motion/react; swatch leads. |
| Formation | uicapsule (kyh/uicapsule, MIT) | Gallery | Vertical wheel left to the page, keyboard browse, tap-to-open lightbox. |
| Balance Chart | ssychui | Market chart | Real candles on a time axis, loading/error/empty states. |
| Tangle Footer | radiumcoders | Footer | CSS entrance instead of motion/react; copy fitted per ring for a seamless loop. |

Animation dependency: GSAP only (nav, Lore, Gallery).
