"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Formation from "@/components/ui/formation";
import type { Work } from "@/components/ui/formation-utils/formation-poses";

type Art = Work & { width: number; height: number; caption: string };

/**
 * The curated campaign set: twenty 1:1 works sequenced so neighbours never share a
 * kind (character, macro, wide, abstract, object), including where the ring wraps.
 * Masters live in CPU_SITE_VISUALS_40; next/image serves sized AVIF/WebP.
 */
const ART: Art[] = [
  { title: "Hero master", image: "/art/campaign/square/01-hero-master.webp", alt: "CPU in a black compute chamber beneath a curved mint halftone structure", caption: "Hero master", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Visor macro", image: "/art/campaign/square/03-hero-visor-macro.webp", alt: "Extreme close-up of CPU's dark optical visor and mint Hyperliquid mark", caption: "Visor macro", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Long horizon", image: "/art/campaign/square/13-long-horizon.webp", alt: "CPU looking across a reflective platform toward a distant compute skyline", caption: "Long horizon", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Compute throne", image: "/art/campaign/square/28-compute-throne.webp", alt: "CPU seated on a monumental processor throne in a dark compute chamber", caption: "Compute throne", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Pipeline", image: "/art/campaign/square/11-the-pipeline.webp", alt: "Mint particles moving through a curved transparent compute pipeline", caption: "The pipeline", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Body kit", image: "/art/campaign/square/24-body-kit-object.webp", alt: "CPU's black and white armour with the mint Hyperliquid chest mark, alone in a black studio", caption: "Body kit", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Rear three-quarter", image: "/art/campaign/square/04-hero-rear-three-quarter.webp", alt: "CPU seen from behind facing a giant curved halftone compute structure", caption: "Rear three-quarter", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Data surface", image: "/art/campaign/square/21-data-surface.webp", alt: "A translucent green wave crossing a black reflective surface", caption: "Data surface", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Portrait", image: "/art/campaign/square/02-hero-close-portrait.webp", alt: "Close portrait of CPU's fur, forehead stripes, visor, and armor collar", caption: "Close portrait", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Eligible", image: "/art/campaign/square/19-eligible.webp", alt: "CPU crossing from a dark hall into a sharply lit mint zone", caption: "Eligible", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Under the GPU", image: "/art/campaign/square/36-under-the-gpu.webp", alt: "A small CPU standing beneath the mint-lit underside of a colossal GPU", caption: "Under the GPU", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Distribution", image: "/art/campaign/square/17-distribution.webp", alt: "Glass channels carrying mint light outward from a central Hyperliquid mark", caption: "Distribution", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Compute core", image: "/art/campaign/square/12-compute-core.webp", alt: "CPU looking up at a massive suspended liquid-cooled processor", caption: "Compute core", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "CPU glass object", image: "/art/campaign/square/22-cpu-glass-object.webp", alt: "CPU's dark optical visor floating as a precision glass product", caption: "CPU glass object", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Cooling", image: "/art/campaign/square/20-gpu-liquid-cooling.webp", alt: "Mint coolant moving through glass channels in a black processor assembly", caption: "GPU liquid cooling", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Glass vault", image: "/art/campaign/square/30-glass-vault.webp", alt: "CPU inside a vast transparent vault with floating mint glass forms", caption: "Glass vault", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Visor reflection", image: "/art/campaign/square/35-visor-reflection.webp", alt: "Side view of CPU's glass visor reflecting a processor and the Hyperliquid mark", caption: "Visor reflection", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Black monolith", image: "/art/campaign/square/32-black-server-monolith.webp", alt: "A small CPU facing an enormous matte-black compute monolith", caption: "Black server monolith", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Final portrait", image: "/art/campaign/square/40-final-portrait.webp", alt: "Definitive full-body CPU campaign portrait in a dark compute environment", caption: "Final portrait", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
  { title: "Accumulation", image: "/art/campaign/square/16-accumulation.webp", alt: "Mint particles accumulating inside a transparent glass vessel", caption: "Accumulation", width: 1536, height: 1536, fit: "cover", objectPosition: "center" },
];

/** The art is capped at 80dvh tall: that bounds it in landscape, the side padding does in portrait. */
const LIGHTBOX_SIZES = "(orientation: landscape) 80vh, 92vw";

function Lightbox({ index, onClose, onStep }: { index: number | null; onClose: () => void; onStep: (d: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const art = index !== null ? ART[index] : null;
  // Only the two neighbours are fetched ahead, at the same size, so stepping is instant.
  const neighbours = index !== null ? [ART[(index + 1) % ART.length], ART[(index - 1 + ART.length) % ART.length]] : [];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onStep(1);
        if (e.key === "ArrowLeft") onStep(-1);
      }}
      aria-label={art ? art.caption : "Artwork"}
      className="m-auto h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-paper backdrop:bg-cpu-black/90 backdrop:backdrop-blur-sm open:flex"
    >
      {art && (
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 p-[clamp(1rem,4vw,3rem)]">
          <figure className="relative flex h-full max-h-[80dvh] w-full items-center justify-center">
            <div
              className="relative h-full w-full"
              style={{ maxWidth: `min(100%, calc(80dvh * ${art.width / art.height}))`, aspectRatio: `${art.width} / ${art.height}` }}
            >
              <Image
                key={art.image}
                src={art.image}
                alt={art.alt}
                fill
                sizes={LIGHTBOX_SIZES}
                className="rounded-lg object-contain"
                style={art.fit === "contain" ? { background: "radial-gradient(80% 70% at 50% 35%, #0b3a33, #031613)" } : undefined}
              />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute size-px overflow-hidden opacity-0">
              {neighbours.map((n) => (
                <Image key={n.image} src={n.image} alt="" fill loading="eager" sizes={LIGHTBOX_SIZES} />
              ))}
            </div>
          </figure>
          <figcaption className="flex w-full max-w-3xl items-center justify-between gap-4 text-sm">
            <span className="text-paper/80">{art.caption}</span>
            <span className="tabular text-muted-foreground">
              {String(index! + 1).padStart(2, "0")} / {String(ART.length).padStart(2, "0")}
            </span>
          </figcaption>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-sm bg-ink-1/70 text-paper/80 backdrop-blur-md transition-colors hover:bg-ink-2 hover:text-paper"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onStep(-1)}
            aria-label="Previous artwork"
            className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-sm bg-ink-1/70 text-paper/80 backdrop-blur-md transition-colors hover:bg-ink-2 hover:text-paper"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            aria-label="Next artwork"
            className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-sm bg-ink-1/70 text-paper/80 backdrop-blur-md transition-colors hover:bg-ink-2 hover:text-paper"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </dialog>
  );
}

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + ART.length) % ART.length)), []);

  return (
    <section id="gallery" tabIndex={-1} aria-labelledby="gallery-title" className="relative pt-[clamp(4rem,8vw,7rem)]">
      {/* Phones: the formation is width-bound, so a shorter stage leaves no empty bands. */}
      <div className="relative h-[min(100svh,58rem)] min-h-[min(36rem,100svh)] max-sm:h-[min(88svh,40rem)]">
        <Formation works={ART} onSelect={setOpen} onFocusChange={setFocused} label="CPU artwork gallery" />
        {/* The stage's empty centre carries the title and the piece in focus. */}
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center">
          <h2
            id="gallery-title"
            className="text-[clamp(2rem,4.6vw,4.25rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-paper [font-variation-settings:'wdth'_112,'opsz'_144] [text-shadow:0_6px_40px_rgba(2,12,10,0.9)]"
          >
            Cat. Compute.
            <br />
            Power.
          </h2>
          <p className="mt-5 flex items-baseline gap-3 text-sm text-paper/70 [text-shadow:0_2px_16px_rgba(2,12,10,0.95)]" aria-live="polite">
            <span className="tabular font-mono text-xs text-mint/80">
              {String(focused + 1).padStart(2, "0")} / {String(ART.length).padStart(2, "0")}
            </span>
            {ART[focused]?.caption}
          </p>
        </div>
        <p className="pointer-events-none absolute bottom-6 left-(--gutter) z-30 text-xs text-paper/40 max-sm:hidden">
          Drag sideways or use the arrow keys · tap a piece to open it
        </p>
      </div>
      <Lightbox index={open} onClose={() => setOpen(null)} onStep={step} />
    </section>
  );
}
