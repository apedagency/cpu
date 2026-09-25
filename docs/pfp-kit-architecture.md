# PFP kit architecture

Upload any PFP, wear CPU, adjust, export. Everything runs in the browser.

The wearable system is **the glasses** (always on), **CPU upper-body armour**
(optional, five angles) and subtle glass effects. There is no head piece: no
cat ears, fur, stripes, whiskers or helmet. The uploaded character keeps its
own head; the official character is the reference for the visor, materials,
armour and colour only.

## Generation (Higgsfield MCP)

Every wearable was generated with the Higgsfield connector, conditioned on the
official references (`assets/cpu-character.png` panels, `public/art/gallery/face-*`,
`public/art/character/bust.webp`, the turnaround views and suit close-ups).
`public/pfp-kit/source/manifest.json` records every candidate: model, job id and
verdict.

| Asset | Candidates | Selected | Model |
| --- | --- | --- | --- |
| Visor | 8 (GPT Image 2.5 ×3, Nano Banana Pro ×3, Seedream 5 Pro ×2) | `visor-01` — closest silhouette to the official visor (IoU 0.957) | GPT Image 2.5, native alpha |
| Body front | 5 | `front-00` | GPT Image 2.5, native alpha |
| Body right ¾ / left ¾ | 4 + 4 | `r34-00` / `l34-02` (a matched pair, ~30°) | GPT Image 2.5 |
| Body right / left | 3 + 3 | `right-12` / `left-13` (a matched pair, ~60°) | GPT Image 2.5 |

The angle candidates were generated with the selected front as the primary
reference (plus the official turnaround view for that direction), so the five
angles are one armour kit. Selected bodies were upscaled to 4K with Higgsfield's
upscaler; its RGB is recombined with the 2K native alpha.

Generation workspace (not committed): `CPU_PFP_GENERATION/` — candidates per
folder, `rejected/`, `selected/`, and the processing scripts.

## Extraction

- **Visor** (`process_visor.py`). The render `C` is read as dark glass plus
  light: `base = min(C, #021e1c)`, `L = 1 − (1 − C)/(1 − base)`. `L` is split
  multiplicatively into highlight (bright achromatic), reflection (soft
  achromatic) and glow (chromatic mint/teal), so screening them back over the
  base reproduces the render exactly (mean error 0). The dark outline ring is its
  own always-solid layer. Light layers are stored unpremultiplied from black
  (alpha = max channel).
- **Effects** share the visor frame: a softened drop shadow, a mint rim light
  outside the glass, and a faint wide sheen.
- **Bodies** (`process_body.py`). Native alpha; edge colour pulled from the
  nearest solid pixel (no halos over light or dark). The collar opening is
  fitted as an ellipse (`fit_collar.py`); a neck-wide slot is removed from the
  front lip upward so the wearer's own neck passes into the collar and the
  collar's dark interior stays visible either side.
- **Official Hyperliquid mark.** Never generated. Glasses: the SVG path
  (`components/brand/marks.tsx`) is drawn at runtime with a lit gradient and glow.
  Chest modules were generated blank; the same path is rasterised onto each,
  warped by the module's shape: scale from the collar ring, horizontal
  foreshortening capped at 0.72 so it never reads as an "H", plus the panel's
  shear.

## Files

```
public/pfp-kit/
  visor/     visor-main.{png,webp} visor-glass-base visor-rim visor-reflection
             visor-highlight visor-glow-mask   (.png masters, .webp runtime @1400)
  body/      body-{front,right-34,left-34,right,left}.{png @2560, webp @2048}
  effects/   glass-reflection-soft mint-rim-light visor-shadow (.png/.webp, half-res)
  previews/  body-*.webp (angle thumbnails), visor.webp
  source/    *-higgsfield.webp (selected masters) + manifest.json
```

## Geometry (`manifest.ts`)

- **Glasses** pivot on the mark centre (the eye line). `DEFAULTS.glasses`
  puts it at 40.5 % height with a glass width of 46 % of the canvas.
- **Body** anchors at the centre of the collar's front lip. Each angle stores
  that point and its collar-ring width; the ring is a horizontal circle, so its
  width survives rotation and is the shared scale. Switching angle keeps the
  neck in place at the same scale. Default: lip at 75 % height, ring 30 % wide.

## Rendering (`compose.ts`)

One `drawPfp()` renders the preview (backing store ≤ 1400 px) and the 2048 ×
2048 PNG export: background → PFP → armour → glasses. The glasses draw, inside
one matrix: shadow → teal multiply (keeps the face's light, tints it) → base at
the Glass amount → solid rim → soft sheen, reflection, glow, highlight and rim
light with `screen` → the official mark. Measured preview/export difference:
~1/255 mean (resampling only).

## Editor

Visible layers: **PFP**, **Glasses**, **Body** (21st Toolbar Dynamic dock,
below the stage so the adjusted layer stays in view).

- PFP: scale, position, reset.
- Glasses: scale, rotate, glass, reset.
- Body: **angle first** (21st Segmented Control with thumbnails: Left, Left ¾,
  Front, Right ¾, Right), then scale, position, armour on/off, reset.
- Direct manipulation stays primary: alpha hit-testing picks what you touch;
  drag moves, the corner dot scales and turns (snaps level within 3°), two
  fingers pinch/rotate/pan, ctrl/trackpad pinch zooms, plain wheel scrolls the
  page. Keyboard on the stage: arrows move, +/− scale, [ ] rotate.
- Upload turns everything on at the default fit (glasses selected, front
  armour). The other angles load in the background once someone is wearing it.
- Empty stage: the glasses float over an open face zone with the upload prompt
  (PNG, JPEG or WebP; 20 MB limit secondary) and the armour faint below.

Uploads are decoded with `createImageBitmap` into a bounded canvas; no upload
endpoint exists and nothing leaves the browser.
