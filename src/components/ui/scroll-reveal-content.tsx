"use client";

// Scroll Reveal Content A by abui (21st.dev).
// CPU adaptation: motion's useScroll is a GSAP ScrollTrigger that writes the
// progress bars and states straight to the DOM (no React render per scroll
// frame). The signature is kept — every numbered point stays on the page, the
// active one fills its vertical line, and the media beside it changes with it
// — with the media wiped in from below instead of a flat opacity swap. Takes
// any number of steps; below lg it becomes a plain stacked story (no pinning).

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-media";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export interface RevealStep {
  id: string;
  title: ReactNode;
  body: ReactNode;
  image: string;
  alt: string;
  /** object-position for the crop. */
  focus?: string;
  /** Extra zoom, anchored at the bottom (crops text baked into the top of a render). */
  zoom?: number;
}

export function ScrollRevealContent({ steps, className }: { steps: RevealStep[]; className?: string }) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const n = steps.length;
      let current = -1;
      const show = (index: number) => {
        if (index === current) return;
        const previous = current;
        current = index;
        itemRefs.current.forEach((el, i) => el?.toggleAttribute("data-active", i === index));
        mediaRefs.current.forEach((el, i) => {
          if (!el) return;
          if (i === index) {
            gsap.killTweensOf(el);
            if (reduced || previous === -1) gsap.set(el, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, zIndex: 2, autoAlpha: 1 });
            else
              gsap.fromTo(
                el,
                { clipPath: "inset(100% 0% 0% 0%)", scale: 1.08, zIndex: 2, autoAlpha: 1 },
                { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 0.9, ease: "power3.inOut" },
              );
          } else if (i === previous) {
            gsap.set(el, { zIndex: 1 });
            gsap.to(el, { autoAlpha: 0, duration: 0.3, delay: reduced ? 0 : 0.6 });
          } else {
            gsap.set(el, { autoAlpha: 0, zIndex: 0 });
          }
        });
      };
      const st = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          barRefs.current.forEach((bar, i) => {
            if (!bar) return;
            const local = Math.min(1, Math.max(0, p * n - i));
            bar.style.transform = `scaleY(${local})`;
          });
          show(Math.min(n - 1, Math.floor(p * n)));
        },
      });
      show(0);
      return () => st.kill();
    });
    return () => mm.revert();
  }, [steps, reduced]);

  return (
    <div ref={rootRef} className={cn("relative lg:h-(--story-h)", className)} style={{ "--story-h": `${steps.length * 90}svh` } as React.CSSProperties}>
      <div className="lg:sticky lg:top-0 lg:flex lg:h-svh lg:items-center">
        <div className="grid w-full gap-x-[clamp(3rem,7vw,8rem)] px-(--gutter) lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
          <ol className="flex flex-col gap-[clamp(2.5rem,5vh,3.5rem)] max-lg:gap-16">
            {steps.map((step, i) => (
              <li
                key={step.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className="group grid grid-cols-[2.5rem_1fr] gap-x-5 lg:opacity-40 lg:transition-opacity lg:duration-500 lg:data-active:opacity-100"
              >
                <span className="font-mono text-xs leading-8 text-mint/80">{String(i + 1).padStart(2, "0")}</span>
                <div className="relative pl-6">
                  <span aria-hidden="true" className="absolute inset-y-1 left-0 w-px bg-paper/12" />
                  <span
                    ref={(el) => {
                      barRefs.current[i] = el;
                    }}
                    aria-hidden="true"
                    className="absolute inset-y-1 left-0 w-px origin-top scale-y-0 bg-teal shadow-[0_0_10px_var(--cpu-teal)] max-lg:scale-y-100"
                  />
                  <h3 className="text-[clamp(1.6rem,2.6vw,2.5rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-paper [font-variation-settings:'wdth'_108,'opsz'_96]">
                    {step.title}
                  </h3>
                  <div className="mt-3 max-w-md space-y-3 text-[0.975rem] leading-relaxed text-paper/65">{step.body}</div>
                  <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-md lg:hidden">
                    <Image src={step.image} alt={step.alt} fill sizes="90vw" className="origin-bottom object-cover" style={{ objectPosition: step.focus, scale: step.zoom }} />
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="relative hidden aspect-[4/5] max-h-[78svh] w-full overflow-hidden rounded-md lg:block">
            {steps.map((step, i) => (
              <div
                key={step.id}
                ref={(el) => {
                  mediaRefs.current[i] = el;
                }}
                className="invisible absolute inset-0"
              >
                <Image
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 1px"
                  className="origin-bottom object-cover"
                  style={{ objectPosition: step.focus, scale: step.zoom }}
                />
              </div>
            ))}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_0_1px_rgba(151,252,228,0.08),inset_0_-120px_120px_-60px_rgba(3,22,19,0.7)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScrollRevealContent;
