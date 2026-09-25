# CPU refinement plan

## Global environment

- **Current issue:** Hero owns the only WebGL field while Lore, Compute, Engine, Gallery, Market, and Footer reset to opaque section backgrounds.
- **Proposed fix:** Promote the existing halftone shader into one fixed `SiteEnvironment` behind the complete page. Sections become transparent content planes. GSAP `ScrollTrigger` changes light position, halftone visibility, glass emphasis, line energy, and vignette without changing worlds.
- **Files involved:** `src/app/page.tsx`, `src/app/globals.css`, `src/features/environment/site-environment.tsx`, all section roots, `src/components/ui/halftone-dots-led-screen.tsx`.
- **Technique:** One capped-DPR WebGL canvas, CSS atmospheric layers, section-local data attributes, scrubbed CSS custom properties, `gsap.context()` cleanup, reduced-motion still state.
- **Dependency impact:** None. Reuse GSAP and the raw WebGL component.
- **Performance risk:** A fixed canvas remains visible for the page lifetime. Keep one context, cap pixels/DPR, pause on hidden documents, and render a still under reduced motion.

## Navbar

- **Current issue:** The desktop contract reads as a bordered CA chip and competes with navigation.
- **Proposed fix:** Add a plain-text contract treatment with the full address at wide sizes, a quiet shortened presentation at medium sizes, and the full address inside the menu on mobile. Preserve copy semantics and subtle status feedback.
- **Files involved:** `src/components/contract-copy.tsx`, `src/features/nav/site-nav.tsx`.
- **Technique:** Semantic button styled as information, responsive address spans, scroll-state blur only after movement.
- **Dependency impact:** None.
- **Performance risk:** None.

## Loader

- **Current issue:** The Hyperliquid mark transitions to a generic CPU silhouette, then fades without spatial connection to the hero visor.
- **Proposed fix:** Keep the existing Dot Transition opening, replace its second mask with a dedicated glass visor/cat-shade SVG, then move and scale that glass toward the live hero head before dissolving.
- **Files involved:** `src/features/loader/site-loader.tsx`, `src/features/hero/hero.tsx`, `public/loader/cpu-glass-shade.svg`.
- **Technique:** Shared `data-hero-visor-target`, DOMRect interpolation with GSAP, loader surface transparent during handoff, existing readiness/session/reduced-motion gates retained.
- **Dependency impact:** None.
- **Performance risk:** One short SVG/GSAP handoff on first session only.

## PFP engine

- **Current issue:** Official CPU character art is the base product; transforms are global and users cannot upload or fit their own image.
- **Proposed fix:** Replace the generator state with an upload-first local composition: user image, body kit, helmet shell, visor glass, official mark/reflection, and optional effects. Each important layer has an independent transform; direct manipulation and accessible controls share one state model.
- **Files involved:** `src/features/engine/{engine,compose,manifest,state}.tsx|ts`, `public/pfp-kit/**`, `docs/pfp-kit-architecture.md`.
- **Technique:** Canvas 2D for both preview and 2048 export, SVG kit assets loaded as images, `createImageBitmap` upload normalization, pointer drag/scale/rotate handles, two-pointer gestures, keyboard and sliders, object URL cleanup.
- **Dependency impact:** No Three.js. SVG/canvas provides better preview/export parity at much lower weight.
- **Performance risk:** Large uploads and pointer frequency. Normalize to a bounded bitmap, draw preview at display resolution, render 2048 only during export, batch pointer updates with animation frames.

## Component decisions

| Component | Decision | Rationale |
| --- | --- | --- |
| Dot Transition | Keep + refine | Strong branded opening; second mask and handoff need CPU glass language. |
| Immersive Full Screen Navigation | Keep + refine | Interaction and accessibility are strong; header/contract density needs quieting. |
| Halftone Dots | Keep + promote | Strongest environmental language; should become page-level, not hero-only. |
| Variable Text Proximity | Keep | Brand-fit interaction with reduced-motion and visibility safeguards. |
| Sticky Content Wrapper | Keep + refine | Editorial sequence works; remove its opaque background ownership. |
| Amount Slider | Keep | Useful in Compute and accessible; reuse for layer controls where appropriate. |
| Segmented Control | Keep + refine | Suitable for concise editor layer/effect selection. |
| Formation | Keep + refine | Distinctive gallery spatiality; remove its private background and align depth with the world. |
| Balance Chart | Keep + refine | Real data behavior is strong; add restrained path reveal only if stable. |
| Tangle Footer | Keep + refine | Strong close; make its ground transparent so it resolves the shared world. |

