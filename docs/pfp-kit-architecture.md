# PFP kit architecture

## Layer order

1. `background` — CPU dark/halftone procedural field.
2. `userPfp` — normalized local upload; always remains visible.
3. `body` — transparent portrait armour frame.
4. `helmet` — shell around the face with a transparent centre.
5. `visor` — translucent optical glass and rim.
6. `mark` — exact official Hyperliquid path, positioned inside the visor.
7. `reflection` — specular streaks and front optical highlight.
8. `effects` — optional edge glow/vignette.

## Layer transforms

`userPfp`, `body`, `helmet`, and `visor` each store `x`, `y`, `scale`, `rotation`, and `opacity` in normalized stage coordinates. `mark` and `reflection` follow the visor. Optional link-kit mode applies visor drag/scale/rotation deltas to the helmet while preserving both layers' offsets. Defaults are portrait-safe and every layer can be reset independently.

## Uploaded-image handling

- Accept PNG, JPEG, and WebP up to 20 MB.
- Reject unsupported MIME types and empty/oversized files with an inline error.
- Decode with `createImageBitmap(file, { imageOrientation: "from-image" })` where supported; fall back to an object-URL-backed `HTMLImageElement`.
- Normalize the source into a bounded offscreen canvas (maximum 3072 px on its longest edge) for predictable preview memory while keeping enough detail for a 2048 export.
- Transparent images remain transparent; non-square images begin in cover framing.
- Drag-and-drop, file input, and clipboard paste use the same local pipeline.

## Pointer and touch interaction

- A tap selects the top-most editable layer hit in the stage; the layer strip is the deterministic fallback.
- One pointer drags the selected layer.
- Corner handles scale around the layer centre; the top handle rotates.
- Two active touch pointers scale and rotate from their initial distance/angle.
- Wheel zoom is active only while the stage is focused or hovered and calls `preventDefault` only for an intentional zoom gesture.
- Pointer samples are accumulated in refs and committed through `requestAnimationFrame` to avoid React updates at hardware sampling rate.

## Keyboard and fallback controls

- Arrow keys nudge; Shift + Arrow makes a larger nudge.
- `+`/`-` scale and `[`/`]` rotate the selected layer.
- Sliders/numeric readouts expose position, scale, rotation, and opacity without requiring drag.
- Reset selected layer and reset all are real buttons with visible focus states.

## Asset paths

- `public/pfp-kit/visor/visor-glass.svg`
- `public/pfp-kit/helmet/helmet-shell.svg`
- `public/pfp-kit/body/body-kit.svg`
- `public/pfp-kit/effects/front-reflection.svg`
- `public/loader/cpu-glass-shade.svg`

These are code-authored vector kit assets derived from the official CPU silhouette, palette, and exact Hyperliquid mark. No new character artwork is generated.

## Rendering and export decision

SVG provides the transparent shell/glass geometry and Canvas 2D performs composition. The same `drawPfp` function renders both live preview and export, including gradients, opacity, transforms, and the official mark. This ensures close parity and removes the need for Three.js or a separate WebGL export path.

Preview draws at the displayed size capped at 1400 physical pixels. Export allocates a temporary 2048 × 2048 canvas, calls the same compositor, creates a PNG blob, triggers download, releases the object URL, and drops canvas references.

## Privacy model

Uploaded bytes are decoded entirely in the browser. No upload endpoint, form submission, analytics payload, or remote image URL is created. The UI states: “Your image stays in your browser.” Share links encode only kit transforms/settings and never include the user image.

## Mobile behavior

- The stage stays square and uses `touch-action: pan-y` until a direct manipulation begins.
- Handles are at least 44 px at display size.
- The layer strip scrolls horizontally; controls stack below the stage.
- Two-pointer gestures are optional enhancement; sliders and keyboard-compatible controls remain complete fallbacks.
- Export remains 2048 × 2048 regardless of preview resolution.
