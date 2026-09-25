// Sticky Content Wrapper by hyperiux (21st.dev).
// CPU adaptation: scroll snap removed (it hijacked scroll after the user
// stopped), the fixed "scroll" hint removed, w-screen → w-full (no horizontal
// overflow), next/image media, and each step takes a ReactNode body.
"use client";

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import { useLayoutEffect, useRef, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export interface StickyContentItem {
  id: string;
  eyebrow?: string;
  heading: ReactNode;
  body: ReactNode;
  image: string;
  alt: string;
  /** How the media sits in its frame: cover crops, contain shows the full figure. */
  fit?: "cover" | "contain";
  mediaClassName?: string;
}

interface StickyContentProps {
  items: StickyContentItem[];
  className?: string;
  contentEnterYPercent?: number;
  contentExitYPercent?: number;
  contentTransitionDuration?: number;
  contentDelay?: number;
  stepGap?: number;
  initialImageScale?: number;
  activeImageScale?: number;
  exitImageScale?: number;
}

export default function StickyContentWrapper({
  items,
  className = "",
  contentEnterYPercent = 8,
  contentExitYPercent = -6,
  contentTransitionDuration = 0.9,
  contentDelay = 0.35,
  stepGap = 2,
  initialImageScale = 1.35,
  activeImageScale = 1.1,
  exitImageScale = 1,
}: StickyContentProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!sectionRef.current || !items.length) return;
    const reducedMotion = prefersReducedMotion();

    const context = gsap.context(() => {
      const contents = contentRefs.current;
      const images = imageRefs.current;

      contents.forEach((content, index) => {
        gsap.set(content, {
          autoAlpha: index === 0 ? 1 : 0,
          yPercent: index === 0 ? 0 : contentEnterYPercent,
          zIndex: items.length - index,
        });
      });

      images.forEach((image, index) => {
        gsap.set(image, {
          autoAlpha: reducedMotion ? (index === 0 ? 1 : 0) : 1,
          zIndex: items.length - index,
          clipPath: "inset(0% 0% 0% 0%)",
          scale: reducedMotion ? 1 : index === 0 ? activeImageScale : initialImageScale,
          transformOrigin: "center center",
        });
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: reducedMotion ? true : 1,
        },
      });

      // Each step holds, fully readable, for the first part of its segment
      // before handing off (upstream began the hand-off at scroll zero).
      const dwell = stepGap * 0.45;
      items.forEach((_, index) => {
        if (index === items.length - 1) return;
        const stepStart = index * stepGap + dwell;
        const nextContentStart = stepStart + contentTransitionDuration + contentDelay;

        timeline
          .to(
            contents[index],
            { autoAlpha: 0, yPercent: contentExitYPercent, duration: contentTransitionDuration, ease: "power2.inOut" },
            stepStart,
          )
          .fromTo(
            contents[index + 1],
            { autoAlpha: 0, yPercent: contentEnterYPercent },
            { autoAlpha: 1, yPercent: 0, duration: contentTransitionDuration, ease: "power2.inOut" },
            nextContentStart,
          )
          .to(
            images[index],
            reducedMotion
              ? { autoAlpha: 0, duration: stepGap - dwell, ease: "none" }
              : { clipPath: "inset(0% 0% 100% 0%)", scale: exitImageScale, duration: stepGap - dwell, ease: "power1.inOut" },
            stepStart,
          );

        timeline.to(
          images[index + 1],
          reducedMotion
            ? { autoAlpha: 1, duration: stepGap - dwell, ease: "none" }
            : { scale: activeImageScale, duration: stepGap, ease: "none" },
          stepStart,
        );
      });

      // Closing hold so the last step is read before the section releases.
      timeline.to({}, { duration: dwell });
      ScrollTrigger.refresh();
    }, sectionRef);

    return () => context.revert();
  }, [
    items,
    contentEnterYPercent,
    contentExitYPercent,
    contentTransitionDuration,
    contentDelay,
    stepGap,
    initialImageScale,
    activeImageScale,
    exitImageScale,
  ]);

  return (
    <section
      ref={sectionRef}
      className={`relative w-full ${className}`}
      style={{ height: `${items.length * 100}svh` }}
    >
      {/* Inactive steps are visibility:hidden mid-scroll, so assistive tech
          reads the whole story from this list instead of the visual stage. */}
      <ol className="sr-only">
        {items.map((item) => (
          <li key={item.id}>
            <h3>{item.heading}</h3>
            <div>{item.body}</div>
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="sticky top-0 flex h-svh w-full justify-between max-[1025px]:flex-col-reverse max-[1025px]:justify-end max-[1025px]:gap-6 max-[1025px]:px-(--gutter) max-[1025px]:pb-8 max-[1025px]:pt-20"
      >
        <div className="relative h-full w-[46%] max-[1025px]:h-[52%] max-[1025px]:w-full">
          {items.map((item, index) => (
            <div
              key={item.id}
              ref={(el) => {
                contentRefs.current[index] = el;
              }}
              className="absolute inset-0 flex h-full w-full flex-col justify-center pl-(--gutter) pr-[4vw] opacity-0 max-[1025px]:justify-start max-[1025px]:p-0"
            >
              {item.eyebrow && <p className="type-label mb-5 text-mint/80 max-[1025px]:mb-3">{item.eyebrow}</p>}
              <p className="mb-6 text-[clamp(2rem,4.2vw,4.25rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-paper [font-variation-settings:'wdth'_112,'opsz'_96] max-[1025px]:mb-4">
                {item.heading}
              </p>
              <div className="max-w-136 space-y-4 text-[clamp(1rem,1.15vw,1.1875rem)] leading-relaxed text-paper/75">
                {item.body}
              </div>
            </div>
          ))}
        </div>

        <div className="relative h-full w-[54%] overflow-hidden max-[1025px]:h-[42%] max-[1025px]:w-full max-[1025px]:rounded-xl">
          {items.map((item, index) => (
            <div
              key={item.id}
              ref={(el) => {
                imageRefs.current[index] = el;
              }}
              className={`absolute inset-0 h-full w-full opacity-0 ${item.mediaClassName ?? ""}`}
            >
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(max-width: 1025px) 100vw, 54vw"
                className={item.fit === "contain" ? "object-contain" : "object-cover"}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
