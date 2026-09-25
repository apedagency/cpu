# CPU — UI/UX review

Reviewed in the running site (Chrome, `next dev`), not from source alone. Captures at
1440 × 900, 1024 × 768, 834 × 1112 and 390 × 844, a fresh-session loader run, the
post-loader page, and the open fullscreen nav. Commit under review: `dc4c6f9`.

Verdicts: **KEEP** (works, leave it), **REFINE** (right component, wrong
composition/detail), **REPLACE** (wrong component or wrong model of the task).

## Summary

| Section | Verdict | One-line reason |
| --- | --- | --- |
| Loader | KEEP | Branded, fast, releases correctly; lifecycle is locked. |
| Navbar | REFINE | Bar is good; the open panel's bordered social buttons and boxed art cards read as a component library. |
| Hero | KEEP | Strongest composition on the page. Only the action hierarchy needs to feed the rest of the site. |
| Lore | REFINE | The statement is excellent; the sticky story is a flush-right image slab that reads as a pasted demo and glitches on mobile. |
| Compute | REPLACE | A dashboard assembled from three tools: 4 figure cards + fee box + calculator column + wallet column, ~20 simultaneous values. |
| Engine (PFP) | REPLACE | Photoshop-lite inspector around crude polygon kit art. Wrong assets and wrong interaction model. |
| Gallery | REFINE | Formation is still the most distinctive component, but it sits in a repeated header pattern with a pill mode switcher and an empty stage centre. |
| Market | REFINE | Factual and readable; needs calmer ground, a stronger number/chart relationship and the site's action style instead of a second outlined Dexscreener box. |
| Footer | REPLACE | The mint ring wall is the loudest thing on the page, hard-cut above a boxed contract + three bordered buttons. It closes the site in a different visual language. |

## Cross-page problems

1. **Section intro template.** Compute, Engine, Gallery and Market all open with the
   same three parts: mint `type-label`, a 4.5rem headline, and a grey paragraph pushed
   right. Four identical intros in a row is the strongest "generated" signal on the page.
2. **One button style for everything.** `rounded-md border border-mint/15..25 px-4
   min-h-11 hover:border-teal` is used for socials (nav + footer), Engine's
   Upload/Reset/Reset all, Market's Dexscreener, the error retry and the lightbox.
   The primary teal fill appears in hero, Engine export and wallet Read with no rule.
3. **Borders as the only separator.** `border-mint/10`–`/18` draws every row, card,
   panel and divider (Compute ledger cards, fee box, calculator rows, wallet grid,
   Engine inspector, Market stats, footer). Hierarchy is carried by hairlines, not by
   space, scale or light.
4. **Radius drift.** `rounded` → `rounded-md` → `rounded-lg` → `rounded-xl` →
   `rounded-full` coexist in adjacent controls (Engine alone uses md, lg, xl, full and
   10px). Nothing says why a surface is round.
5. **Spacing formula.** Four sections use exactly `py-[clamp(5rem,10vw,9rem)]` +
   `mb-12/14` + `gap-16/20`, so every section has the same breathing pattern
   regardless of what it contains.
6. **Environment behind utility.** The halftone field is at full contrast behind
   Compute's figures and Market's chart (visible scale pattern through the numbers at
   1440). Utility sections need calmer ground; Engine can take more glass light.

## Loader — KEEP

- **Hierarchy:** one idea at a time: dot grid → Hyperliquid mark → CPU glass → hero.
- **Spacing / type:** only name + ticker at the corners; correct restraint.
- **Interaction:** skip on key/wheel/touch/click, release before the exit animation,
  handoff to the hero visor. Verified: released, unmounted, unlocked on both widths.
- **Brand fit:** strong; the dot field is the same language as the site environment.
- **21st quality:** Dot Transition keeps its signature assembly.
- **Mobile:** mark and glass scale correctly.
- **Pasted?** No. **Coherent?** Yes: it introduces the world the site lives in.
- Action: none. Lifecycle, gate script and scroll ownership stay untouched.

## Navbar — REFINE

- **Hierarchy:** bar is right: brand left, anchors, quiet full contract address.
  Active underline is subtle and good.
- **Interaction:** open/close, inert-when-closed and scroll lock verified.
- **Open panel:** the giant links work. The two art tiles are boxed `rounded-lg border`
  cards and the socials are three bordered rectangles, the same generic control as
  everywhere else.
- **Mobile:** stack is fine; socials wrap to two rows of boxes.
- **Pasted?** The panel's footer area does. **Coherent?** Mostly.
- Action: socials become text actions with the arrow glyph; art tiles lose the card
  chrome (no border, sharper corners, light from the environment instead).

## Hero — KEEP

- **Hierarchy:** stencil CPU → character → name → $CPU + live price → one teal action.
  Instantly readable at every width.
- **Spacing:** asymmetric and intentional (title top-left, price bottom-left, CTA
  bottom-right).
- **Interaction:** subtle pointer lean on fine pointers only; loader handoff target.
- **Brand fit / 21st:** halftone world + official art, strongest on the page.
- **Mobile:** stacks well; bottom rail gradient keeps price legible.
- **Coherent?** It defines the language the rest should follow: big type, one
  light source, few controls, one filled action.
- Action: none structural. Its teal-filled button becomes the defined PRIMARY action.

## Lore — REFINE

- **Hierarchy:** the Variable Text Proximity statement is the best editorial moment on
  the site. The sticky story after it drops to a stock two-column "text left / image
  slab right" layout.
- **Spacing:** the image slab is flush to the right viewport edge with hard corners
  while everything else floats in the environment; at 1440 the third step leaves the
  left half empty for a full viewport.
- **Interaction:** scrubbed clip-path reveal works, but reads as the upstream demo.
- **Mobile:** the image card and the step text overlap during hand-off (text renders
  behind the image, 390 capture).
- **Pasted?** The sticky wrapper does. **Coherent?** The statement yes; the story no.
- Action: search 21st for editorial scroll storytelling; keep the three short steps.

## Compute — REPLACE

- **Hierarchy:** none. At 1440 the first screen shows 4 figure cards with badge chips
  (HISTORICAL/PAID/PENDING/PENDING), sub-lines, progress bars, then a boxed fee split
  with legend, then a 3-column mechanics row. The calculator and wallet then sit side
  by side with a vertical rule. Roughly 20 values compete.
- **Spacing:** generic; rows separated only by hairlines.
- **Interaction:** the slider is good (Amount Slider), but its main outputs are
  "Holder fees per $10,000 traded" and "Your slice of that", which read as a reward
  projection even though the copy says otherwise.
- **Brand fit:** a dark SaaS dashboard.
- **21st quality:** the Amount Slider is strong; everything around it is hand-rolled
  cards and rows.
- **Mobile:** 4 viewport-heights of stacked rows before the wallet form.
- **Pasted?** It reads like three tools pasted together. **Coherent?** No.
- Action: rebuild around three levels: the machine (2–3 live numbers) → your CPU
  (one module, Amount | Wallet) → mechanics (one factual flow + secondary facts).

## Engine (PFP) — REPLACE

- **Assets:** `helmet-shell.svg` (white dome + graphite pods), `body-kit.svg`
  (polygons) and the SVG visor are geometric reinterpretations. They look like generic
  sci-fi armour, not CPU. The character lock says the head is *never* a helmet.
- **Hierarchy:** the canvas competes with a full inspector (5 sliders, background
  switch, finish switch, instructions paragraph, link checkbox) plus a 4-tab layer grid
  plus 4 buttons.
- **Interaction:** direct manipulation exists but is hidden behind selection
  handles and explained in a paragraph.
- **Empty state:** a dashed "Upload your PFP" rectangle on top of floating kit
  polygons.
- **Mobile:** canvas, then a tall form.
- **Pasted?** It is a small image editor. **Coherent?** No.
- Action: rebuild the kit from official art (visor, ear/crown head frame,
  shoulders), make the canvas the product, move all controls into one 21st-sourced
  floating toolbar with contextual controls only.

## Gallery — REFINE

- **Hierarchy:** Formation's orbit of official art is still premium and specific,
  but at 1440 the cards are small and the middle of the stage is empty.
- **Interaction:** drag/keys/tap work; the Ellipse/Arc/Ring/Orbit switcher is a
  rounded-full pill bar, one of the "pill navigation" patterns the project avoids.
- **Spacing:** header repeats the common intro template; the caption hides in the
  right-side paragraph.
- **Mobile:** readable ring, tiny cards, pill switcher overlaps the Market intro.
- **Pasted?** The pill switcher and header do; the formation itself does not.
- Action: keep Formation. Move the focused caption and index into the empty stage
  centre as large editorial type, restyle the mode switch as a sharp text selector,
  and drop the template header.

## Market — REFINE

- **Hierarchy:** pair name ↔ big price ↔ chart ↔ stat list is sensible and factual.
- **Spacing:** the stat list's six hairline rows are the same row pattern as Compute.
- **Interaction:** Balance Chart scrub and ranges work on real candles; the active
  range is a rounded-full pill.
- **Brand fit:** fine, but the environment is noisy behind the line.
- **Mobile:** long stat list; good chart.
- **Pasted?** No. **Coherent?** Mostly; it repeats the intro template.
- Action: keep Balance Chart and real candles. Calm the environment for Market,
  compose the header around the price, stats as a quiet typographic strip, and a
  text action for Dexscreener.

## Footer — REPLACE

- **Hierarchy:** five solid mint text rings dominate a full viewport, then a hard
  horizontal cut into a boxed contract field and three bordered buttons.
- **Brand fit:** the mint wall is louder than the hero and does not appear anywhere
  else on the site.
- **Mobile:** rings compress into a small arch with the cat's head clipped.
- **Pasted?** Yes: it is the upstream demo recoloured.
- Action: search 21st for a closing composition that resolves the environment:
  large type, the contract as an interaction, socials as text actions.

## Action hierarchy (to apply everywhere)

| Level | Use | Style |
| --- | --- | --- |
| PRIMARY | One per viewport: Dexscreener (hero), Export PNG, Read wallet | Teal fill, ink text, sharp 2px radius, glow on hover |
| SECONDARY | Upload/replace, retry | Paper text on a glass surface, no border until hover |
| TEXT | Socials, receipts, Signal, Dexscreener (market/footer) | Label + ↗, underline on hover, no box |
| UTILITY | Layer tools, ranges, mode switches, copy | Icon or small caps in a shared glass toolbar; active state is light, not a pill |

Radius rule: glass surfaces (toolbar, canvas) 6px; actions 2px; the visor and
round avatars keep their natural shape; nothing else is `rounded-full`.

---

## Outcome (after the refinement pass)

### 21st.dev components evaluated and selected

Every selection was inspected as code and as a demo recording, not from its
thumbnail. Components written for framer-motion were ported to GSAP so the
site keeps one animation runtime; each keeps its defining composition.

| Need | Evaluated | Selected | Kept from upstream |
| --- | --- | --- | --- |
| PFP tool shell | Toolbar Dynamic (ibelick), Toggle Group Animated Toolbar (uiable), Dynamic Toolbar (0xUrvish), Toolbar Dock (ruixen), DockMorph (ruixen), macOS Dock (ssychui), Image Editor Toolbar (cnippet) | **Toolbar Dynamic** + the sliding highlight of **Toggle Group Animated Toolbar** | One surface; the panel springs to the measured height of only the active item's content; tapping the open tab folds it |
| PFP upload | File Upload with border beam (extend-hq), Upload Dropzone Empty State, Image Upload Crop Editor (shadcnspace), Avatar Uploader (efferd) | None — the canvas itself is the drop zone | Rejected: all are form-style dashed boxes; the brief asks for the upload to live in the canvas |
| Live numbers | Number Flow (barvian), Animated Blur Number (serafimcloud), Animate Digits (unlumen), Rolling Digits | **Number Flow** (`@number-flow/react`, dependency-free) | Odometer digit roll |
| Amount / Wallet switch | Animated Tabs (educalvolpz), Discrete Tab (0xUrvish), Slide Tabs (uniquesonu), Segmented Tabs (micka_design) | **Animated Tabs**, underline variant | Sliding indicator, roving tabindex, ←/→/Home/End |
| Fee flow | Animated Beam (Magic UI), Gradient Tracing (preetsuthar17), Tracing Beam (Aceternity) | **Animated Beam** | Travelling gradient along a curved path between anchors (type anchors, no logo nodes) |
| Lore story | Scroll Reveal Content A (abui), Horizontal Feature Reveal (hyperiux), Scroll 01 (felipemenezes098), Scroll Image Tunnel (ruixen) | **Scroll Reveal Content A** (replaces Sticky Content Wrapper) | All numbered points stay readable; the active one fills its vertical line; media changes with it |
| Footer | Hover Footer (mdafsarx), Footer with Minimal Outline, Footer with Suite (scrollxui), Worth Keeping CTA (ziegfiroyt) | **Hover Footer — Text Hover Effect** (replaces Tangle Footer) | Outline draw-in + cursor-following reveal mask |
| Chart | Balance Chart (kept) | — | Timeframe slider restyled from ringed pill to the site's underline |
| Gallery | Formation (kept) | — | Pill mode switcher restyled as a text selector |

### Final verdicts

| Section | Verdict | What changed |
| --- | --- | --- |
| Loader | KEEP | Untouched. |
| Navbar | REFINED | Panel socials are text actions; art tiles lost their card chrome. Bar and lifecycle untouched. |
| Hero | KEEP (this pass) | Not edited here. A concurrent agent replaced the hero art with campaign renders during this pass. |
| Lore | REFINED | Sticky Content Wrapper → Scroll Reveal Content A. |
| Compute | REPLACED | Machine (one dominant credited figure, paid/waiting split, live stream) → Your CPU (one module, Amount | Wallet) → Mechanics (fee flow + facts). The per-$10k arithmetic moved into "How rewards scale". |
| Engine | REPLACED | Kit re-extracted from official art; canvas-first editor with a floating contextual dock; empty state is the kit waiting for a face. |
| Gallery | REFINED | Title and focused caption live in the stage centre; mode switch is a text selector. |
| Market | REFINED | Price leads, full-width chart, stats as one strip, text action for Dexscreener, calmer environment. |
| Footer | REPLACED | Tangle Footer → launch line, contract, text links and the lit $CPU wordmark. |

### Action and radius system (as applied)

- PRIMARY: teal fill, `rounded-xs` — Export, Read.
- SECONDARY / TEXT: label + ↗, underline on hover — socials, Dexscreener (Market), Claim on Signal, How rewards scale, Reset.
- UTILITY: icons in the glass dock, `rounded-sm`; selectors are text with a teal underline (nav, Amount/Wallet, chart range, Formation).
- Glass surfaces (stage, dock, Your CPU module, art panels): `rounded-md`. No other `rounded-full` except status dots and the upload/handle glyphs.
