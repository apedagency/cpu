"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DiscordIcon, XIcon } from "@/components/brand/marks";
import { ContractCopy } from "@/components/contract-copy";
import { FullscreenNav, NavLinkHover, useNavState, useStaggerReveal } from "@/components/ui/immersive-full-screen-nav";
import { links, nav, network, pairedAsset, site } from "@/lib/config";
import { cn } from "@/lib/utils";

const SOCIALS = [
  { label: "X", href: links.x, icon: <XIcon className="size-5" /> },
  { label: "Dexscreener", href: links.dexscreener, icon: null },
  { label: "Discord", href: links.discord, icon: <DiscordIcon className="size-5" /> },
];

function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      setScrolled(window.scrollY > 24);
      // The section crossing 40% of the viewport is current; hero/footer → none.
      const line = window.innerHeight * 0.4;
      let current: string | null = null;
      for (const n of nav) {
        const r = document.getElementById(n.id)?.getBoundingClientRect();
        if (r && r.top <= line && r.bottom > line) current = n.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { scrolled, active };
}

const goTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
  el.focus({ preventScroll: true });
};

function Panel() {
  const { isOpen, close } = useNavState();
  const rootRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(isOpen, rootRef, 0.95);

  return (
    <div ref={rootRef} className="flex min-h-dvh w-full flex-col justify-between gap-10 px-(--gutter) pb-8 pt-24 text-paper md:pt-28">
      <div data-reveal="head" className="flex flex-col gap-1 opacity-0">
        <p className="type-label text-mint">{site.name}</p>
        <p className="text-sm text-paper/60">
          ${site.ticker} · {network.name} · Paired with {pairedAsset.name}
        </p>
      </div>

      <div className="flex items-end justify-between gap-10 max-[1025px]:flex-col max-[1025px]:items-start">
        <ul className="flex flex-col">
          {nav.map((item) => (
            <li
              key={item.id}
              data-reveal="link"
              className="text-[clamp(3rem,8vw,7.5rem)] font-semibold leading-[0.98] tracking-[-0.03em] opacity-0 [font-variation-settings:'wdth'_120,'opsz'_144] hover:text-mint"
            >
              <NavLinkHover
                label={item.label}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  close(() => goTo(item.id));
                }}
              />
            </li>
          ))}
        </ul>

        <div className="flex gap-4 max-[1025px]:w-full">
          {[
            { src: "/art/character/bust.webp", alt: "CPU bust portrait", w: 1542, h: 1600 },
            { src: "/art/character/stance.webp", alt: "CPU standing in full exosuit", w: 1287, h: 1800 },
          ].map((m) => (
            <div
              key={m.src}
              data-reveal="media"
              className="relative h-[clamp(9rem,20vw,17rem)] w-[clamp(7rem,15vw,13rem)] overflow-hidden rounded-md bg-[radial-gradient(80%_70%_at_50%_35%,#0b3a33,#031613)] opacity-0 max-[1025px]:h-40 max-[1025px]:flex-1"
            >
              <Image src={m.src} alt={m.alt} fill sizes="(max-width: 1025px) 45vw, 15vw" className="object-contain object-bottom p-2" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <ul className="flex flex-wrap items-center gap-x-7 gap-y-1">
          {SOCIALS.map((s) => (
            <li key={s.label} data-reveal="social" className="opacity-0">
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-11 items-center gap-2 text-base font-medium text-paper/80 transition-colors hover:text-paper"
              >
                {s.icon}
                <span className="underline-offset-[6px] group-hover:underline">{s.label}</span>
                <ArrowUpRight className="size-3.5 text-mint/70 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <div data-reveal="meta" className="w-full max-w-md opacity-0">
          <ContractCopy variant="plain-full" className="w-full" />
        </div>
      </div>
    </div>
  );
}

function HeaderContent({ scrolledActive: active }: { scrolledActive: string | null }) {
  const { isOpen } = useNavState();
  return (
        <>
          <a
            href="#top"
            className="flex shrink-0 items-center gap-3"
            onClick={(e) => {
              if (isOpen) return;
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
              history.replaceState(null, "", " ");
            }}
          >
            <Image
              src="/art/gallery/sticker.webp"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full ring-1 ring-mint/30"
              priority
            />
            <span className="type-display text-[1.35rem] text-paper">CPU</span>
            <span className="sr-only">{site.name} — back to top</span>
          </a>

          <ul
            className={cn(
              "ml-auto hidden items-center gap-1 transition-opacity duration-300 lg:flex",
              isOpen && "pointer-events-none opacity-0",
            )}
          >
            {nav.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={active === item.id ? "true" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(item.id);
                  }}
                  className={cn(
                    "relative inline-flex min-h-11 items-center px-3 text-sm font-medium text-paper/70 transition-colors hover:text-paper",
                    active === item.id && "text-paper",
                  )}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-teal transition-transform duration-500 ease-out",
                      active === item.id && "scale-x-100",
                    )}
                  />
                </a>
              </li>
            ))}
          </ul>

          <ContractCopy
            variant="plain"
            className={cn(
              "ml-auto hidden md:inline-flex lg:ml-4",
              isOpen && "pointer-events-none opacity-0",
            )}
          />
        </>
  );
}

export function SiteNav() {
  const { scrolled, active } = useScrollState();

  return (
    <FullscreenNav
      clipOrigin="top"
      overlayBg="#031613"
      barColor="var(--cpu-white)"
      barOpenColor="var(--cpu-teal)"
      openDuration={1}
      closeDuration={1}
      headerClassName={cn(
        "transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled
          ? "border-b border-mint/10 bg-cpu-black/75 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
      header={<HeaderContent scrolledActive={active} />}
    >
      <Panel />
    </FullscreenNav>
  );
}
