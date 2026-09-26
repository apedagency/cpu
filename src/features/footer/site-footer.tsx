import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { DiscordIcon, XIcon } from "@/components/brand/marks";
import { ContractCopy } from "@/components/contract-copy";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { links, network, pairedAsset, pool, site } from "@/lib/config";

const LINKS = [
  { label: "X", href: links.x, icon: <XIcon className="size-4" /> },
  { label: "Dexscreener", href: links.dexscreener, icon: null },
  { label: "Signal", href: links.signal, icon: null },
  { label: "Discord", href: links.discord, icon: <DiscordIcon className="size-4" /> },
].filter((l): l is typeof l & { href: string } => l.href !== null);

/**
 * The close: the launch line, the contract as one big copyable line, links
 * as text, and the stencil wordmark from the hero lit by the cursor.
 */
export function SiteFooter() {
  return (
    <footer id="footer" className="relative isolate overflow-hidden" aria-labelledby="footer-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full sm:w-[min(64vw,54rem)] mask-[linear-gradient(90deg,transparent_0%,black_42%,black_100%)]">
        <Image
          src="/art/campaign/square/40-final-portrait.webp"
          alt=""
          fill
          loading="lazy"
          sizes="(max-width: 639px) 100vw, min(64vw, 54rem)"
          className="object-cover object-center opacity-30"
        />
        <div className="absolute inset-0 bg-linear-to-b from-cpu-black/25 via-cpu-black/55 to-cpu-black" />
      </div>
      <div className="px-(--gutter) pt-[clamp(6rem,12vw,11rem)]">
        <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p id="footer-title" className="text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-paper [font-variation-settings:'wdth'_110,'opsz'_144]">
              {site.tagline.replace(" the connection.", "")}
              <br />
              <span className="text-mint">the connection.</span>
            </p>
            <div className="mt-10 max-w-full">
              <p className="mb-2 text-xs text-paper/40">Contract · {network.name}</p>
              <ContractCopy variant="plain-full" className="text-paper/80 [&_span.font-mono]:text-[clamp(0.8rem,1.6vw,1.2rem)]" />
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-8 gap-y-3 lg:flex-col lg:items-end lg:gap-y-2">
            {LINKS.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-11 items-center gap-2 text-lg font-medium text-paper/80 transition-colors hover:text-paper"
                >
                  {l.icon}
                  <span className="underline-offset-[6px] group-hover:underline">{l.label}</span>
                  <ArrowUpRight className="size-4 text-mint/70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-[clamp(3rem,7vw,6rem)] px-[calc(var(--gutter)*0.5)]">
        <TextHoverEffect text={`$${site.ticker}`} />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 px-(--gutter) pb-8 pt-6 text-xs text-paper/40">
        <p>
          {site.name} · {network.name} · {pool.launchpad} · {pool.venue}
        </p>
        <p className="max-w-3xl leading-relaxed lg:text-right">
          Not financial advice. Holder rewards depend on trading activity and are paid in {pairedAsset.wrapper.symbol} only as the contract distributes
          them; nothing here is a promised return. {pairedAsset.name} is a trademark of NVIDIA Corporation, which is not affiliated with this project.
        </p>
      </div>
    </footer>
  );
}
