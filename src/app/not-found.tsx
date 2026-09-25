import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/config";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-cpu-black px-(--gutter) text-center">
      <div className="halftone-field pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="relative flex flex-col items-center gap-6">
        <Image src="/art/gallery/face-front.webp" alt="" width={220} height={170} className="h-auto w-44" priority />
        <p className="type-display text-[clamp(4rem,14vw,9rem)] text-ink-3" aria-hidden="true">
          404
        </p>
        <h1 className="text-2xl font-semibold text-paper">Nothing to process here.</h1>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md bg-teal px-5 text-sm font-semibold text-ink-1 hover:bg-mint"
        >
          Back to {site.name}
        </Link>
      </div>
    </main>
  );
}
