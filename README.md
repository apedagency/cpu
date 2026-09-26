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

The editor is upload-first: users add a PNG, JPEG, or WebP locally and wear CPU over it — the CPU
glasses and, optionally, a CPU armour frame in one of five angles. There is no head piece: the
wearer keeps their own head. The image never leaves the browser. Preview and 2048 × 2048 PNG export
share the Canvas 2D compositor in `src/features/engine/compose.ts`.

Layers (registered in `src/features/engine/manifest.ts`):

- `public/pfp-kit/visor/` — the glasses as separable glass layers (base, rim, reflection, glow,
  highlight) plus a flattened `visor-main`; the official Hyperliquid mark is drawn from its SVG path.
- `public/pfp-kit/body/` — a universal armour frame (wide open top, no neck geometry) in five angles:
  `body-front`, `body-right-34`, `body-left-34`, `body-right`, `body-left`; the profiles also have a
  `-back` layer (the inner back seen through the open top) drawn under the PFP.
- `public/pfp-kit/effects/` — contact shadow, mint rim light, soft reflection (they follow the glasses).
- `public/pfp-kit/previews/` — angle-picker thumbnails; `public/pfp-kit/source/` — the selected
  Higgsfield masters and `manifest.json` (models, job ids, verdicts, processing).

See `docs/pfp-kit-architecture.md` for generation, extraction, geometry and interaction details.

## Artwork pipeline

All character art comes from the supplied files (`assets/cpu-character.png`, the banner frames) and
the project's official listing images (Dexscreener portrait, Signal launch head). Renders were
cropped from the character sheet, upscaled 4× locally with Real-ESRGAN (anime model), and cut out
with BiRefNet — no new character art was generated. The PFP wearables (glasses and armour, no
head) were generated with Higgsfield from those official references at the owner's request; see the
PFP section. Logos are the official files: Hyperliquid brand kit, NVIDIA (svgl), X and Discord
(Simple Icons).

## 21st.dev components

| Component | Author | Used for | Adaptation |
| --- | --- | --- | --- |
| Dot Transition | hyperiux | Loader (Hyperliquid mark → CPU silhouette) | Play-once mode gated on real asset readiness; session-only; skipped for reduced motion. |
| Immersive Full Screen Navigation | hyperiux | Navbar + menu | Dark header, `inert` closed panel, context API, interruptible toggle. |
| Halftone Dots · LED screen | paper-design (Paper Shaders, Apache-2.0) | Global site environment | One persistent CPU recipe, cursor ripple on fine pointers only, still frame for reduced motion. |
| Variable Text Proximity | hyperiux | Lore statement | Self-hosted Roboto Flex, runs only in view. |
| Sticky Content Wrapper | hyperiux | Lore story | Snap removed, per-step dwell, screen-reader copy. |
| Amount Slider | serafimcloud | Compute position, Engine zoom | Stop-index (log) mapping, formatted rolling readout. |
| Segmented Control | ddoemonn | Engine armour-angle picker | GSAP thumb instead of motion/react; thumbnail cells. |
| Formation | uicapsule (kyh/uicapsule, MIT) | Gallery | Vertical wheel left to the page, keyboard browse, tap-to-open lightbox. |
| Balance Chart | ssychui | Market chart | Real candles on a time axis, loading/error/empty states. |
| Tangle Footer | radiumcoders | Footer | CSS entrance instead of motion/react; copy fitted per ring for a seamless loop. |

Animation dependency: GSAP only (nav, Lore, Gallery).
