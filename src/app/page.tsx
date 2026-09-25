import { Compute } from "@/features/compute/compute";
import { MarketProvider } from "@/features/data/market-context";
import { Engine } from "@/features/engine/engine";
import { SiteEnvironment } from "@/features/environment/site-environment";
import { SiteFooter } from "@/features/footer/site-footer";
import { Gallery } from "@/features/gallery/gallery";
import { Hero } from "@/features/hero/hero";
import { SiteLoader } from "@/features/loader/site-loader";
import { Lore } from "@/features/lore/lore";
import { Market } from "@/features/market/market";
import { SiteNav } from "@/features/nav/site-nav";

export default function Home() {
  return (
    <MarketProvider>
      <SiteEnvironment />
      <a
        href="#main"
        className="sr-only fixed left-4 top-4 z-120 rounded-md bg-teal px-4 py-3 text-sm font-semibold text-ink-1 focus:not-sr-only"
      >
        Skip to content
      </a>
      <SiteLoader />
      <SiteNav />
      <main id="main" tabIndex={-1} className="relative z-10 focus-visible:outline-2 focus-visible:outline-teal focus-visible:outline-offset-[-2px]">
        <Hero />
        <Lore />
        <Compute />
        <Engine />
        <Gallery />
        <Market />
      </main>
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </MarketProvider>
  );
}
