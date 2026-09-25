"use client";

import Image from "next/image";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DiscordIcon, XIcon } from "@/components/brand/marks";
import { ContractCopy } from "@/components/contract-copy";
import { FullscreenNav, NavLinkHover, useNavState, useStaggerReveal } from "@/components/ui/immersive-full-screen-nav";
import { useCopy } from "@/hooks/use-copy";
import { links, nav, network, pairedAsset, site, token } from "@/lib/config";
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
          <p className="type-label">Contract Address</p>
          <ContractCopy variant="plain-full" className="w-full" />
        </div>
      </div>
    </div>
  );
}

const EASE_ROLL = "duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] motion-reduce:transition-none";

/** Header-only controls step back while the fullscreen panel is open. */
const hiddenWhileOpen = (isOpen: boolean) =>
  cn("transition-[opacity,visibility] duration-300", isOpen && "invisible opacity-0");

function Brand() {
  const { isOpen, close } = useNavState();
  return (
    <a
      href="#top"
      className="group/brand flex shrink-0 items-center gap-2.5"
      onClick={(e) => {
        e.preventDefault();
        const toTop = () => {
          window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          history.replaceState(null, "", " ");
        };
        if (isOpen) close(toTop);
        else toTop();
      }}
    >
      <Image
        src="/art/gallery/sticker.webp"
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-full ring-1 ring-mint/25 transition-shadow duration-300 group-hover/brand:ring-teal/60"
        priority
      />
      <span className="type-display text-[1.25rem] text-paper">CPU</span>
      <span className="sr-only">{site.name} — back to top</span>
    </a>
  );
}

/**
 * Centre links after 21st.dev's Elevate Navbar (hyperiux): a hovered label
 * rolls up to a copy of itself while its siblings dim. Its grey pill and
 * dropdowns are dropped; one teal rule slides to the current section instead.
 */
function CenterNav({ active }: { active: string | null }) {
  const { isOpen } = useNavState();
  const navRef = useRef<HTMLElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = navRef.current;
    const rule = ruleRef.current;
    if (!root || !rule) return;

    const place = (slide: boolean) => {
      const label = active ? root.querySelector<HTMLElement>(`[data-label="${active}"]`) : null;
      if (!label) {
        rule.style.opacity = "0";
        return;
      }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Fade in where it lands; only slide from one link to the next.
      rule.style.transitionProperty = slide && !reduce && rule.style.opacity === "1" ? "transform, opacity" : "opacity";
      const x = label.getBoundingClientRect().left - root.getBoundingClientRect().left;
      rule.style.transform = `translateX(${x}px) scaleX(${label.offsetWidth})`;
      rule.style.opacity = "1";
    };

    place(true);
    // Re-measure when the row itself changes width (breakpoint, font swap).
    let width = root.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (root.offsetWidth === width) return;
      width = root.offsetWidth;
      place(false);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [active]);

  return (
    <nav ref={navRef} aria-label="Primary" inert={isOpen} className={cn("relative hidden lg:block", hiddenWhileOpen(isOpen))}>
      <ul className="group/nav flex items-center">
        {nav.map((item) => {
          const current = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(item.id);
                }}
                className={cn(
                  "group/link inline-flex min-h-11 items-center px-3.5 text-sm font-medium transition-colors duration-300",
                  current ? "text-paper" : "text-paper/60",
                  "group-has-[a:hover]/nav:text-paper/40 hover:text-paper!",
                )}
              >
                <span data-label={item.id} className="relative block overflow-hidden">
                  <span className={cn("block transition-transform group-hover/link:-translate-y-full", EASE_ROLL)}>
                    {item.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn("absolute inset-0 translate-y-full transition-transform group-hover/link:translate-y-0 motion-reduce:hidden", EASE_ROLL)}
                  >
                    {item.label}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <span
        ref={ruleRef}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-0 h-px w-px origin-left bg-teal opacity-0 duration-500 ease-[cubic-bezier(0.625,0.05,0,1)]"
      />
    </nav>
  );
}

/**
 * A quiet utility, not a CTA: it reads "Contract Address", copies the full
 * address, and rolls to "Copied" (the Elevate CTA's text swap) for a moment.
 */
function ContractButton() {
  const { isOpen } = useNavState();
  const { copy, copied, failed } = useCopy();
  const swapped = copied || failed;

  return (
    // Below 420px the brand and menu get the row; the address lives in the menu.
    <div inert={isOpen} className={cn("hidden min-[420px]:block", hiddenWhileOpen(isOpen))}>
      <button
        type="button"
        onClick={() => void copy(token.address)}
        aria-label={`Copy ${token.symbol} contract address`}
        className={cn(
          "relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-xs border bg-ink-1/40 px-3.5 text-[0.8125rem] font-medium whitespace-nowrap",
          "transition-[background-color,border-color,color] duration-300 hover:bg-teal/8",
          // 44px hit area around the 36px chip.
          "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
          copied ? "border-teal/70 text-teal" : "border-teal/30 text-paper/85 hover:border-teal/60 hover:text-paper",
        )}
      >
        <span className="grid overflow-hidden">
          <span className={cn("col-start-1 row-start-1 transition-transform", EASE_ROLL, swapped ? "-translate-y-full" : "translate-y-0")}>
            Contract Address
          </span>
          <span
            aria-hidden="true"
            className={cn("col-start-1 row-start-1 text-center transition-transform", EASE_ROLL, swapped ? "translate-y-0" : "translate-y-full")}
          >
            {failed ? "Copy failed" : "Copied"}
          </span>
        </span>
        <span className="relative grid size-3.5 place-items-center" aria-hidden="true">
          <Copy className={cn("size-3.5 text-mint/60 transition-opacity duration-300", copied ? "opacity-0" : "opacity-100")} />
          <Check className={cn("absolute size-3.5 text-teal transition-opacity duration-300", copied ? "opacity-100" : "opacity-0")} />
        </span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Contract address copied" : failed ? "Copy blocked. The full address is listed in the menu." : ""}
      </span>
    </div>
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
        "border-b transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled ? "border-mint/8 bg-ink-1/70 backdrop-blur-sm" : "border-transparent bg-transparent",
      )}
      brand={<Brand />}
      center={<CenterNav active={active} />}
      actions={<ContractButton />}
    >
      <Panel />
    </FullscreenNav>
  );
}
