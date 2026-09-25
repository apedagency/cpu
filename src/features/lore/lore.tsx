import StickyContentWrapper, { type StickyContentItem } from "@/components/ui/sticky-content-wrapper";
import VariableTextProximity from "@/components/ui/variable-text-proximity";
import { pairedAsset, pool } from "@/lib/config";

/* The mechanism figures below are snapshotted into the token at launch
   (Signal: "per-token terms … cannot change under a live token"); Compute
   reads the same terms live. */
const STEPS: StickyContentItem[] = [
  {
    id: "cat",
    eyebrow: "The cat",
    heading: "Cat Purrcessing Unit.",
    body: (
      <>
        <p>
          The Hyperliquid cat in a black, white and graphite exosuit, with the Hyperliquid mark on its visor and chest.
        </p>
        <p>A HyperEVM token, launched on {pool.launchpad}.</p>
      </>
    ),
    image: "/art/gallery/hero-render.webp",
    alt: "CPU standing on a teal-lit stage in full exosuit",
    fit: "cover",
  },
  {
    id: "pair",
    eyebrow: "The pair",
    heading: <>Paired with {pairedAsset.name}.</>,
    body: (
      <>
        <p>
          CPU trades against {pairedAsset.wrapper.symbol} — {pairedAsset.wrapper.name}, a tokenised NVIDIA share on
          HyperEVM — in a {pool.venue} pool opened by {pool.launchpad}.
        </p>
      </>
    ),
    image: "/art/gallery/bust.webp",
    alt: "Official CPU portrait: visor glowing with the Hyperliquid mark",
    fit: "cover",
  },
  {
    id: "flow",
    eyebrow: "The flow",
    heading: "Fees stream to holders.",
    body: (
      <>
        <p>
          Every trade pays a 1% pool fee. {pool.venue} keeps a seventh; of the rest, 70% streams to wallets holding at
          least 1,000,000 CPU — paid in {pairedAsset.wrapper.symbol}, claimable any time.
        </p>
        <p className="text-paper/55">
          Payouts follow real trading volume. Nothing here is a promised return.
        </p>
      </>
    ),
    image: "/art/banner/banner-a.webp",
    alt: "CPU standing among halftone green waves and glass Hyperliquid coins",
    fit: "cover",
    mediaClassName: "[&_img]:object-[50%_50%]",
  },
];

export function Lore() {
  return (
    <section id="lore" tabIndex={-1} aria-labelledby="lore-title" className="relative bg-ink-1 outline-none">
      <div className="halftone-field pointer-events-none absolute inset-x-0 top-0 h-[70svh] opacity-60" aria-hidden="true" />
      <div className="relative px-(--gutter) pb-[clamp(4rem,10vw,9rem)] pt-[clamp(6rem,14vw,12rem)]">
        <h2 id="lore-title" className="type-label mb-8 text-mint">
          Lore
        </h2>
        <VariableTextProximity
          as="p"
          text="Most memecoins stop at the coin. CPU is paired with NVIDIA, and its trading fees stream to holders in wNVDAx."
          accentWords={["NVIDIA,", "wNVDAx."]}
          radius={150}
          falloff="gaussian"
          baseWeight={320}
          hoverWeight={780}
          baseOpticalSize={48}
          hoverOpticalSize={72}
          className="max-w-[min(72rem,100%)]"
          textClassName="text-[clamp(2rem,5.2vw,5.25rem)] leading-[1.02] text-paper"
        />
      </div>
      <StickyContentWrapper items={STEPS} className="bg-ink-1" />
    </section>
  );
}
