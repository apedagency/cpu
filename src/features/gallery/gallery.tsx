"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Formation from "@/components/ui/formation";
import type { Work } from "@/components/ui/formation-utils/formation-poses";

type Art = Work & { width: number; height: number; caption: string };

/** Every piece is official CPU artwork (character sheet, banner, launch art). */
const ART: Art[] = [
  { title: "Portrait", image: "/art/gallery/bust.webp", alt: "Official CPU portrait with glowing Hyperliquid visor", caption: "Official portrait", width: 1400, height: 1400, fit: "cover" },
  { title: "Hero render", image: "/art/gallery/hero-render.webp", alt: "CPU hero render on a teal stage", caption: "Hero render · character sheet", width: 1112, height: 1400, fit: "cover" },
  { title: "Front", image: "/art/gallery/turn-front.webp", alt: "CPU turnaround, front view", caption: "Turnaround · front", width: 585, height: 1051, fit: "contain" },
  { title: "Detail · chest", image: "/art/gallery/detail-chest.webp", alt: "Close-up of the Hyperliquid chest emblem", caption: "Chest emblem", width: 664, height: 408, fit: "cover" },
  { title: "Three-quarter", image: "/art/gallery/turn-34front.webp", alt: "CPU turnaround, three-quarter front view", caption: "Turnaround · ¾ front", width: 610, height: 1049, fit: "contain" },
  { title: "Face", image: "/art/gallery/face-front.webp", alt: "CPU face close-up, visor and whiskers", caption: "Face · front", width: 1031, height: 795, fit: "contain" },
  { title: "Banner", image: "/art/banner/banner-a.webp", alt: "CPU among halftone green waves and glass Hyperliquid coins", caption: "X banner", width: 2172, height: 724, fit: "cover" },
  { title: "Left side", image: "/art/gallery/turn-left.webp", alt: "CPU turnaround, left side view", caption: "Turnaround · left", width: 547, height: 1064, fit: "contain" },
  { title: "Detail · shoulder", image: "/art/gallery/detail-shoulder.webp", alt: "Shoulder and arm armour close-up", caption: "Shoulder armour", width: 668, height: 408, fit: "cover" },
  { title: "Back", image: "/art/gallery/turn-back.webp", alt: "CPU turnaround, back view with striped tail", caption: "Turnaround · back", width: 591, height: 1062, fit: "contain" },
  { title: "Launch art", image: "/art/gallery/sticker.webp", alt: "Flat CPU head illustration from the Signal launch", caption: "Signal launch art", width: 1024, height: 1024, fit: "cover" },
  { title: "Detail · belt", image: "/art/gallery/detail-belt.webp", alt: "Belt and pouches close-up", caption: "Belt & pouches", width: 684, height: 408, fit: "cover" },
  { title: "Right side", image: "/art/gallery/turn-right.webp", alt: "CPU turnaround, right side view", caption: "Turnaround · right", width: 536, height: 1068, fit: "contain" },
  { title: "Face ¾", image: "/art/gallery/face-34.webp", alt: "CPU face, three-quarter view of the visor", caption: "Face · ¾", width: 959, height: 808, fit: "contain" },
  { title: "Detail · gloves", image: "/art/gallery/detail-gloves.webp", alt: "Armoured glove close-up", caption: "Gloves", width: 664, height: 392, fit: "cover" },
  { title: "Three-quarter back", image: "/art/gallery/turn-34back.webp", alt: "CPU turnaround, three-quarter back view", caption: "Turnaround · ¾ back", width: 639, height: 1060, fit: "contain" },
  { title: "Detail · boots", image: "/art/gallery/detail-boots.webp", alt: "Chunky sci-fi boot close-up", caption: "Boots", width: 668, height: 392, fit: "cover" },
  { title: "Banner II", image: "/art/banner/banner-b.webp", alt: "CPU standing centre stage in the X banner, second frame", caption: "X banner · frame II", width: 2172, height: 724, fit: "cover" },
  { title: "Detail · tail", image: "/art/gallery/detail-tail.webp", alt: "Thick striped tail close-up", caption: "Tail", width: 684, height: 392, fit: "cover" },
];

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
                sizes="90vw"
                className="rounded-lg object-contain"
                style={art.fit === "contain" ? { background: "radial-gradient(80% 70% at 50% 35%, #0b3a33, #031613)" } : undefined}
              />
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
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full border border-mint/20 bg-ink-1/80 hover:border-teal"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onStep(-1)}
            aria-label="Previous artwork"
            className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-mint/20 bg-ink-1/80 hover:border-teal"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            aria-label="Next artwork"
            className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-mint/20 bg-ink-1/80 hover:border-teal"
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
    <section id="gallery" tabIndex={-1} aria-labelledby="gallery-title" className="relative">
      <header className="flex flex-wrap items-end justify-between gap-6 px-(--gutter) pb-8 pt-[clamp(5rem,10vw,9rem)]">
        <div>
          <p className="type-label mb-4 text-mint">Gallery</p>
          <h2
            id="gallery-title"
            className="text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-paper [font-variation-settings:'wdth'_110,'opsz'_120]"
          >
            Every angle of the cat.
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Drag sideways or use the arrow keys. Tap a card to open it.
          <span className="mt-1 block text-paper/70" aria-live="polite">
            {ART[focused]?.caption}
          </span>
        </p>
      </header>
      <div className="h-[min(100svh,56rem)] min-h-[34rem]">
        <Formation works={ART} onSelect={setOpen} onFocusChange={setFocused} label="CPU artwork gallery" />
      </div>
      <Lightbox index={open} onClose={() => setOpen(null)} onStep={step} />
    </section>
  );
}
