# Final production QA

Branch `refinement-interaction-fix`. Production build (`next build` + `next start`) driven with
Playwright (Chromium on the real GPU via ANGLE/D3D11) at 1920, 1600, 1440, 1280, 1180, 1024, 960,
834, 768, 600, 430, 412, 390, 375, 360 and 844×390 landscape. Phone runs use touch emulation,
DPR 3 and, for timing, 4× CPU throttling.

Format: **STATUS · SEVERITY** — issue. `file` — fix.

## Loader

- **FIXED · high** — On a 400 kbps link the server-rendered overlay stayed black ~21 s until
  hydration, then played the full sequence (~25 s). If the JS never loaded, the overlay never
  cleared. `site-loader.tsx`, `globals.css` — the client claims the overlay (`data-live`) when it
  hydrates before 2.5 s. An unclaimed overlay shows the static mark after 1.2 s and fades itself
  at 5 s. Late hydration skips the sequence and never takes the scroll lock. Now the overlay clears
  at ~8 s on 400 kbps and ~6 s on 1.6 Mbps. Normal loads are unchanged and never flash the mark.
- **PASS** — Fresh, phone, repeat visit, reduced motion, wheel / click / key skip, failed hero
  image: lock released on leave, loader unmounted and never hit-testable after, nav usable at once.

## Navbar

- **PASS** — Centre links centred to 0 px at 1024–1920 px, no collisions down to 320 px. "Contract
  Address" copies the full address and rolls to "Copied". No literal address in the bar.
- **PASS** — Menu: open, Escape, rapid toggle, focus trap and restore, section links. Its
  scroll-lock owner is released on close. The closed panel is `inert`, `visibility: hidden`,
  `pointer-events: none`.
- **FIXED · medium** — Discord linked to the bare `https://discord.com` placeholder. `config.ts`,
  `site-nav.tsx`, `site-footer.tsx` — `links.discord` is `null`; menu and footer hide the link
  until an invite URL is set.
- **FIXED · low** — Menu portraits (65 KB) downloaded on first paint, because the hidden fixed
  panel counts as in-viewport. `site-nav.tsx` — mounted on first open.

## Hero

- **PASS** — Character crisp (1137×1600, eager + high priority). The parallax is one damped rAF
  loop, transform-only, fine pointer + no reduced motion only, and recentres on exit. Left as is.
- **FIXED · low** — The price was an `aria-live` region re-announced every 30 s. `hero.tsx`.

## Lore

- **FIXED · high** — The proximity headline read each letter's rect after writing its
  `font-variation-settings`: 3,057 forced layouts in 1.5 s of pointer movement on desktop, and
  ~4 fps on a throttled phone, where `touchmove` drove it under a scrolling finger.
  `variable-text-proximity.tsx` — letter centres measured once per layout, write-only frame
  loop, fine pointers only. Now 175 layouts and 0 dropped frames on desktop; off on touch.

## Compute

- **FIXED · high** — Two full-width square images sat between the reward state and the
  Amount/Wallet tool (≈ one viewport on desktop, 716 px on phones). `compute.tsx` — removed. Both
  works stay in the Gallery.
- **FIXED · medium** — The stream block's `aria-live` wrapped a per-second countdown.
  `machine.tsx` — only the streaming/idle line is live.
- **FIXED · low** — A non-JSON 500 made Wallet mode print `Unexpected token '<'…`.
  `holder-lookup.tsx`, `use-live.ts` — defensive parse, plain message.
- **PASS** — Loading / ready / stale / error / unavailable: no fake zeros, "Unavailable" labels,
  stale data marked "Delayed", fee flow says "not a projection". Calculations untouched.

## PFP Generator

- **FIXED · high** — With an image loaded the stage was `touch-action: none` (a ≈360 px square
  on phones), which trapped page scroll. `engine.tsx` — `pan-y`. A touch now edits only on the
  glasses, the armour or the handle, with two fingers, or on the PFP within 6 s of selecting or
  editing it (a tap selects it). Verified: a swipe on the photo scrolls; glasses, armour, pinch and
  tap-then-drag edit.
- **FIXED · medium** — The decorative visor tile above the stage pushed the editor below the fold
  on phones and tablets. `engine.tsx` — desktop only.
- **FIXED · medium** — The first kit paint re-decoded images on the main thread (70 ms desktop,
  up to 365 ms on a throttled phone). `compose.ts` — layers load as `ImageBitmap`s.
- **FIXED · low** — The stage skeleton shimmered from page load, a style recalc every frame.
  `engine.tsx` — rendered once the section is near.
- **PASS** — 11 portrait types (human, anime, cat, dog, meme, dark, light, close crop, both ¾,
  cut-out). Drag, handle scale/rotate, keyboard, angle switch, resets, drop, paste, type rejection
  all work. The 2048 × 2048 PNG export matches the preview (mean Δ ≈ 1/255) and is pixel-identical
  before and after the fixes.

## Gallery

- **FIXED · high** — 27 works, ~17 of them near-identical front-facing full-body renders.
  `gallery.tsx` — curated to **20**, sequenced so no two neighbours share a kind (character /
  macro / wide / abstract / object), including across the ring's wrap.
- **FIXED · high** — Phones: every formation used a ~330 px band of a ~780 px stage (≈220 px empty
  above and below), with 44 px cards. `gallery.tsx`, `formation-poses.ts` — the stage is
  `min(88svh, 40rem)` on phones, the Ellipse stands upright in portrait, and cards are 52 px. The
  stage fits the viewport in landscape.
- **FIXED · medium** — Card `sizes` (40vw / 220px) didn't match the real 52–280 px cards, and the
  lightbox asked for 90vw when the art is capped at 80dvh. `formation.tsx`, `gallery.tsx` — the
  card and lightbox `sizes` now match what is shown. The lightbox preloads only its two
  neighbours.
- **FIXED · low** — Formation buttons were 27–55 px wide. `formation.tsx` — ≥ 44 px.
- **FIXED · low** — Commented-out legacy array. `gallery.tsx` — removed.

| # | Work | Source | Size |
| --- | --- | --- | --- |
| 01 | `01-hero-master` | 1536×1536 WebP | 197 KB |
| 02 | `03-hero-visor-macro` | 1536×1536 WebP | 94 KB |
| 03 | `13-long-horizon` | 1536×1536 WebP | 72 KB |
| 04 | `28-compute-throne` | 1536×1536 WebP | 203 KB |
| 05 | `11-the-pipeline` | 1536×1536 WebP | 134 KB |
| 06 | `24-body-kit-object` | 1536×1536 WebP | 111 KB |
| 07 | `04-hero-rear-three-quarter` | 1536×1536 WebP | 133 KB |
| 08 | `21-data-surface` | 1536×1536 WebP | 62 KB |
| 09 | `02-hero-close-portrait` | 1536×1536 WebP | 133 KB |
| 10 | `19-eligible` | 1536×1536 WebP | 113 KB |
| 11 | `36-under-the-gpu` | 1536×1536 WebP | 178 KB |
| 12 | `17-distribution` | 1536×1536 WebP | 257 KB |
| 13 | `12-compute-core` | 1536×1536 WebP | 226 KB |
| 14 | `22-cpu-glass-object` | 1536×1536 WebP | 34 KB |
| 15 | `20-gpu-liquid-cooling` | 1536×1536 WebP | 167 KB |
| 16 | `30-glass-vault` | 1536×1536 WebP | 210 KB |
| 17 | `35-visor-reflection` | 1536×1536 WebP | 170 KB |
| 18 | `32-black-server-monolith` | 1536×1536 WebP | 52 KB |
| 19 | `40-final-portrait` | 1536×1536 WebP | 134 KB |
| 20 | `16-accumulation` | 1536×1536 WebP | 208 KB |

All 1:1, lazy, served by `next/image` as AVIF/WebP. Cards render at 121–280 px on desktop
(`sizes` 280px → 384w, or 640w at DPR 2) and 52–108 px on phones (`sizes` 112px → 384w at
DPR 3). The lightbox uses 80vh landscape / 92vw portrait. Lore uses `06`, `08`, `09` (4:3 on
phones, 4:5 on desktop, lazy); the footer backdrop uses `40`; the desktop Engine tile uses `22`.

Served thumbnails (AVIF): phones **576 KB → 190 KB**. Desktop DPR 1 goes 148 → 190 KB, because
the old 256w source was under-resolved for 280 px Orbit cards. A lightbox open at 1440 × 900 is
~63 KB → ~24 KB.

## Market

- **FIXED · low** — The error state printed "Unavailable" at the 6.75 rem price size.
  `market.tsx` — a calm "Price unavailable right now" line; the price row keeps its height and is
  no longer a live region.
- **PASS** — Range switch (1H / 6H / 24H / ALL; 7D appears once the pool is 3 days old), stats,
  axis and min/max labels without overlap at 360 px, Dexscreener link.

## Footer

- **PASS** — X, Dexscreener and Signal links; the full contract copies; legal text; wrapping at
  320–1920 px. The 30 % campaign backdrop stays quieter than the Hero.

## Global environment

- **PASS** — One WebGL context, `pointer-events: none`, pauses when hidden or offscreen, and
  reduced motion renders one still frame.
- **FIXED · medium** — Phones rendered the fullscreen shader at DPR 2 at 60 fps.
  `halftone-dots-led-screen.tsx`, `site-environment.tsx` — coarse pointers get DPR ≤ 1.5, a
  1.2 MP budget and 30 fps. Desktop is unchanged (DPR ≤ 2, 2 MP, 60 fps).
- **FIXED · low** — `useMedia` re-subscribed on every render. `use-media.ts` — stable subscribers.

## Responsive

- **PASS** — No element wider than the viewport at any tested size. The detector was verified
  against an injected 130vw probe. Resizing between phone and desktop widths is clean.

## Performance

| Probe | Before | After |
| --- | --- | --- |
| Lore pointer sweep, desktop | 3,057 layouts · 1.9 s layout | 175 layouts · 0.2 s |
| Lore, throttled phone | ~4 fps (250–370 ms frames) | effect off on touch · 60 fps |
| Idle at the Hero | 60 style recalcs/s | 0 |
| Long tasks during a full scroll, desktop | 86 ms | none |
| Worst long task during a full scroll, throttled phone | 365 ms | ~100 ms |
| Full-scroll transfer, phone DPR 3 | 2,421 KB | 1,837 KB |
| LCP / CLS | 160–556 ms / ≤ 0.002 | unchanged |

## Accessibility

- **PASS** — Tab order: skip link → nav → contract → menu → hero → Compute → PFP → Gallery →
  Market → footer, with visible focus. The menu and lightbox trap and restore focus. Reduced
  motion leaves no content hidden and nothing animating. Live regions are limited to user-driven
  results (copy, wallet lookup, stream state).

## Images

- **FIXED · medium** — The PFP masters (PNG + Higgsfield sources, ≈ 21 MB) sat in `public/` and
  deployed. Moved to `assets/pfp-kit/` (see `docs/pfp-kit-architecture.md`).
- **FIXED · medium** — Unreferenced art sat in `public/`: 19 legacy wide campaign crops, 17 unused
  square works, 6 transparent tiles, the X banners and `character/hero.webp`. All removed; the
  masters stay in `CPU_SITE_VISUALS_40/` (git-ignored) and `assets/`. `public/` went from
  36 MB to 7.2 MB.
- **FIXED · low** — `09-the-flow` carried a stray ~92 % alpha channel. Flattened onto the site black
  (544 → 163 KB); the master is untouched.
- **FIXED · medium** — The OG image was a 1200 × 1200 WebP for a `summary_large_image` card. `og.jpg`
  is rebuilt at 1200 × 630 from the final hero master (148 KB, no metadata).
- **FIXED · low** — Failed images drew Chrome's broken-image box. `layout.tsx`, `globals.css` — a
  capture-phase listener marks them, and CSS hides them.
- **KEPT** — `public/art/gallery/*` crops: the PFP provenance manifest references them.

## Runtime

- **PASS** — 0 console errors or warnings, 0 page errors, 0 failed requests across all viewports.
  API outages (JSON 502, HTML 500), stale polls and image failures all degrade cleanly.
- **FIXED · low** — The cache rule targeted `/pfp/*`, but the kit lives in `/pfp-kit/*`.
  `next.config.ts`.

## Build

- **PASS** — `npm run lint`: 0 problems. `npm run build`: clean, no warnings (baseline and final).
