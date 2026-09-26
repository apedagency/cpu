import { ScrollRevealContent, type RevealStep } from "@/components/ui/scroll-reveal-content";
import VariableTextProximity from "@/components/ui/variable-text-proximity";
import { pairedAsset, pool } from "@/lib/config";

/* The mechanism figures below are snapshotted into the token at launch
   (Signal: "per-token terms … cannot change under a live token"); Compute
   reads the same terms live. */
const STEPS: RevealStep[] = [
  {
    id: "cat",
    title: "Cat Purrcessing Unit.",
    body: (
      <>
        <p>
          The Hyperliquid cat in a black, white and graphite exosuit, with the Hyperliquid mark on its visor and chest.
        </p>
        <p>A HyperEVM token, launched on {pool.launchpad}.</p>
      </>
    ),
    image: "/art/campaign/square/06-the-cat.webp",
    alt: "CPU standing alone in a vast dark chamber with a mint-lit reflective floor",
    focus: "38% 62%",
    zoom: 1.04,
  },
  {
    id: "pair",
    title: <>Paired with {pairedAsset.name}.</>,
    body: (
      <>
        <p>
          CPU trades against {pairedAsset.wrapper.symbol} — {pairedAsset.wrapper.name}, a tokenised NVIDIA share on
          HyperEVM — in a {pool.venue} pool opened by {pool.launchpad}.
        </p>
      </>
    ),
    image: "/art/campaign/square/08-the-pair.webp",
    alt: "CPU between a monumental Hyperliquid glass form and a suspended processor",
    focus: "50% 56%",
  },
  {
    id: "flow",
    title: "Fees stream to holders.",
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
    image: "/art/campaign/square/09-the-flow.webp",
    alt: "CPU beside luminous mint particles flowing through transparent glass channels",
    focus: "58% 50%",
  },
];

export function Lore() {
  return (
    <section id="lore" tabIndex={-1} aria-labelledby="lore-title" className="relative">
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
      <ScrollRevealContent steps={STEPS} className="pb-[clamp(3rem,6vw,5rem)]" />
    </section>
  );
}
