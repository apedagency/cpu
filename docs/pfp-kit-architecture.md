# PFP kit architecture

Upload a PFP, put on CPU, adjust, export. Everything runs in the browser.

## The kit is extracted from official art

The previous kit (`helmet-shell.svg`, `body-kit.svg`, a hand-drawn visor) was
geometric reinterpretation and has been removed. The character lock
(`CPU_CONTENT_100/00_CHARACTER_LOCK`) says the CPU head is organic fur, never a
helmet, so the kit is built from the real character:

| Layer | Source | Extraction |
| --- | --- | --- |
| Visor (glass) | `public/art/gallery/face-front.webp` matte (front view), 4× Real-ESRGAN anime, worked at 2080 px | Dark glass + teal rim segmented, largest component, holes filled, symmetrised about its own axis, contour smoothed. |
| Helmet (head frame) | same front face | The real crown: ears with pink inners, three forehead stripes and the fur wrapping the visor ends. Source symmetrised, visor area and everything below the visor's middle removed so the wearer's face stays visible. |
| Body | `bust.png` 3200 px matte (the official PFP bust) | Head removed with the convex hull of the fur (offset past the chin's shadowed underside); keeps collar LED, hood, chest emblem, straps and shoulder armour. |

Scripts live outside the repo (session scratchpad); outputs are committed as
WebP in `public/pfp-kit/`:

- `visor-tint.webp` — the art's own base glass colour (`rgb(1 27 25)`), alpha = silhouette.
- `visor-edge.webp` — the art's dark outline ring.
- `visor-light.webp` — the art's rim glow and gloss minus the base colour.
- `crown.webp`, `body.webp`.

## How the glass is drawn

Per frame, inside the visor's matrix:

1. **Multiply** the silhouette in teal (`rgb(40 150 136)`): the face keeps its
   light and shading but turns green — reads as tinted glass over any skin tone.
2. **Tint** with the base colour at the Glass amount (default 0.74).
3. **Edge**: the outline, always solid.
4. **Light** with `screen`: the art's rim and gloss brighten whatever is under
   the glass, so the visor stays readable on dark and light PFPs.
5. **Mark**: the exact Hyperliquid path (from `components/brand/marks.tsx`) with
   a scaled canvas glow. The art's stretched mark halo is faded out first.

## Transform model

`state.ts` keeps transforms for `userPfp`, `head`, `visor`, `helmet` and `body`
(x, y in stage fractions; scale; rotation in degrees).

- **Fit together (default)**: visor and helmet gestures write `head`, so both
  pivot on the same point and cannot drift apart.
- **Separately**: gestures write `visor` / `helmet`, which are local transforms
  nested inside the head frame (screen deltas are rotated/scaled into it).
- Resetting either half of a linked kit resets the whole kit.

`manifest.ts` holds the measured geometry (visor frame, crown's visor box, body
neck opening) and the default fit: glass across the eyes at ~42 % height,
crown around it, collar under the chin at ~63 %.

## Interaction

- Direct manipulation first. `hitTest` samples each kit layer's real alpha, so
  touching fur or glass moves the kit and touching the face moves the PFP.
- One pointer drags; the corner dot scales + rotates around the pivot (snaps
  level within 3°); two fingers pinch, rotate and pan; ctrl/trackpad pinch
  zooms; plain wheel always scrolls the page.
- Keyboard on the stage: arrows move, +/− scale, [ ] rotate.
- The dock (21st Toolbar Dynamic, GSAP port) holds Replace · PFP · Visor ·
  Helmet · Body · Export. Selecting a layer opens only its controls:
  PFP scale/position, Visor scale/rotate/glass, Helmet scale/rotate, Body
  scale/position, each with Reset. Desktop: the panel grows up over the stage.
  Mobile: tabs sit under the stage and the panel opens below them.

## Rendering, export and privacy

One `drawPfp()` renders the preview (capped at 1400 px backing store) and the
2048 × 2048 PNG export, so they match (measured mean difference 0.73/255, edges
only). Uploads are decoded with `createImageBitmap` into a bounded canvas; no
upload endpoint exists and nothing leaves the browser.
