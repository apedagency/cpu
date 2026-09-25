import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { DiscordIcon, XIcon } from "@/components/brand/marks";
import { ContractCopy } from "@/components/contract-copy";
import { TangleFooter } from "@/components/ui/tangle-footer";
import { links, network, pairedAsset, pool, site } from "@/lib/config";

const RIBBONS = [
  site.name,
  site.tagline,
  `Paired with ${pairedAsset.name}`,
  `Fees stream to holders in ${pairedAsset.wrapper.symbol}`,
  `${network.name} · ${pool.launchpad} · ${pool.venue}`,
];

const LINKS = [
  { label: "X", href: links.x, icon: <XIcon className="size-4" /> },
  { label: "Dexscreener", href: links.dexscreener, icon: null },
  { label: "Discord", href: links.discord, icon: <DiscordIcon className="size-4" /> },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink-1" aria-labelledby="footer-title">
      <TangleFooter lines={RIBBONS} seed={31}>
        <div className="relative h-full w-full">
          <Image
            src="/art/character/bust.webp"
            alt=""
            fill
            sizes="(max-width: 768px) 30vw, 22vw"
            className="object-cover object-top"
          />
        </div>
      </TangleFooter>

      <div className="relative border-t border-mint/10 px-(--gutter) pb-10 pt-10">
        <div className="flex flex-wrap items-start justify-between gap-x-12 gap-y-8">
          <div className="flex items-center gap-4">
            <Image src="/art/gallery/sticker.webp" alt="" width={56} height={56} className="size-14 rounded-full ring-1 ring-mint/30" />
            <div>
              <p id="footer-title" className="text-lg font-semibold text-paper">
                {site.name}
              </p>
              <p className="type-display text-2xl text-mint">${site.ticker}</p>
            </div>
          </div>

          <div className="flex w-full max-w-xl flex-col gap-3">
            <ContractCopy variant="full" className="w-full" label="Contract" />
            <ul className="flex flex-wrap gap-2">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-mint/15 px-4 text-sm font-medium text-paper transition-colors hover:border-teal/60 hover:text-teal"
                  >
                    {l.icon}
                    {l.label}
                    <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {site.domain.replace("https://", "")} · {network.name}. Not financial advice. Holder rewards depend on trading
          activity and are paid in {pairedAsset.wrapper.symbol} only as the contract distributes them; nothing here is a
          promised return. {pairedAsset.name} is a trademark of NVIDIA Corporation, which is not affiliated with this project.
        </p>
      </div>
    </footer>
  );
}
