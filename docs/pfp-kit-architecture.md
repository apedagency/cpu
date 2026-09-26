# PFP kit architecture

Upload any PFP, wear CPU, adjust, export. Everything runs in the browser.

The wearable system is **the glasses** (always on, the primary identity), a
**CPU armour frame** (optional, five angles) and subtle glass effects. There is no head piece: no
cat ears, fur, stripes, whiskers or helmet. The uploaded character keeps its
own head; the official character is the reference for the visor, materials,
armour and colour only.

## Generation (Higgsfield MCP)

Every wearable was generated with the Higgsfield connector, conditioned on the
official references (`assets/cpu-character.png` panels, `public/art/gallery/face-*`,
`public/art/character/bust.webp`, the turnaround views and suit close-ups).
`assets/pfp-kit/source/manifest.json` records every candidate: model, job id and
verdict.

| Asset | Candidates | Selected | Model |
| --- | --- | --- | --- |
| Visor | 8 (GPT Image 2.5 ×3, Nano Banana Pro ×3, Seedream 5 Pro ×2) | `visor-01` — closest silhouette to the official visor (IoU 0.957) | GPT Image 2.5, native alpha |
| Body front (v2, universal frame) | 6 | `wfront-04` — wide soft-U open top, rounded low shoulders, both shoulders in frame | GPT Image 2.5, native alpha |
| Body right ¾ / left ¾ | 2 + 2 | `wr34-10` / `wl34-11` (a matched pair, ~30°) | GPT Image 2.5 |
| Body right / left | 2 + 2 | `wright-12` / `wleft-13` (a matched pair, ~55–60°) | GPT Image 2.5 |

The v1 bodies (a fitted torso with a collar ring and a neck slot) assumed a
specific neck and head size and were retired: they made anime, animal, meme and
cropped PFPs look like a head pasted into a hole. v2 is a **universal lower
frame**: broad shoulders and a low chest with a wide open top and no neck
geometry, so any head sits over it.

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
- **Bodies** (`process_body_wide.py`). Native alpha; edge colour pulled from
  the nearest solid pixel (no halos over light or dark). Nothing is cut: the
  frame is generated open. On the ~60° profiles the open top shows the armour's
  inner back; `split_back.py` moves it (and the back rim's outline) to
  `body-<angle>-back`, which draws **under** the PFP, so on opaque PFPs the
  opening stays clean and on transparent PFPs it peeks out behind the head.
- **Official Hyperliquid mark.** Never generated. Glasses: the SVG path
  (`components/brand/marks.tsx`) is drawn at runtime with a lit gradient and glow.
  Chest modules were generated blank; the same path is rasterised onto each,
  warped by the module's shape: scale from the module height, horizontal
  foreshortening capped at 0.72 so it never reads as an "H", plus the panel's
  shear.

## Files

Only the runtime layers are served; the masters are kept in the repo but out of
`public/`, so they never deploy.

```
public/pfp-kit/                 runtime (loaded by manifest.ts)
  visor/     visor-glass-base visor-rim visor-reflection visor-highlight
             visor-glow-mask                        (.webp @1400)
  body/      body-{front,right-34,left-34,right,left}.webp @2048
             body-{right,left}-back.webp            (inner back, under the PFP)
  effects/   glass-reflection-soft mint-rim-light visor-shadow (.webp, half-res)
  previews/  body-*.webp (angle thumbnails)

assets/pfp-kit/                 masters (not served)
  visor/     visor-main.{png,webp} + every visor layer as .png @3042
  body/      body-*.png @2560 (+ -back)
  effects/   .png
  previews/  visor.webp
  source/    *-higgsfield.webp (selected generations) + manifest.json
```

## Geometry (`manifest.ts`)

- **Glasses** pivot on the mark centre (the eye line). `DEFAULTS.glasses`
  puts it at 40.5 % height with a glass width of 46 % of the canvas.
- **Body** anchors at the lowest point of the open top between the shoulder
  peaks (where a chin sits). Each angle stores that point and its chest-module
  height; turning about the vertical axis keeps heights, so module height is the
  shared scale and switching angle keeps the frame under the head. Default: the
  open top at 77 % height, shoulders at the canvas edges, chest mark in frame,
  face and jaw clear.

## Rendering (`compose.ts`)

One `drawPfp()` renders the preview (backing store ≤ 1400 px) and the 2048 ×
2048 PNG export: background → armour inner back → PFP → armour front →
glasses. The PFP is never masked or clipped. The glasses draw, inside
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
  Front, Right ¾, Right), then Scale (0.25–3.5×), Height (right raises the
  suit), Shift, armour on/off, reset. Rotation stays on the corner handle,
  pinch and [ ].
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
