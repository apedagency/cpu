// Built using Hyperiux Vault: https://vault.hyperiux.com
// CPU adaptation: Roboto Flex arrives through next/font (no injected <link>),
// the frame loop only runs while the text is on screen, and the component is
// a composable block rather than a full-screen section.
"use client";

import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";

function useInView(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e?.isIntersecting ?? false), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

function useAnimationFrame(callback: () => void, active: boolean) {
  const cb = useRef(callback);
  useLayoutEffect(() => {
    cb.current = callback;
  });
  useEffect(() => {
    if (!active) return;
    let frameId: number;
    const loop = () => {
      cb.current();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [active]);
}

function usePointerPositionRef(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  const positionRef = useRef({ x: -9999, y: -9999 });
  useEffect(() => {
    if (!active) return;
    const updatePosition = (x: number, y: number) => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        positionRef.current = { x: x - rect.left, y: y - rect.top };
      } else {
        positionRef.current = { x, y };
      }
    };
    const handleMouseMove = (ev: MouseEvent) => updatePosition(ev.clientX, ev.clientY);
    const handleTouchMove = (ev: TouchEvent) => {
      const touch = ev.touches[0];
      if (touch) updatePosition(touch.clientX, touch.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [containerRef, active]);
  return positionRef;
}

type Falloff = "linear" | "exponential" | "gaussian";

interface ProximityLettersProps {
  label: string;
  fromFontVariationSettings: string;
  toFontVariationSettings: string;
  containerRef: RefObject<HTMLElement | null>;
  active: boolean;
  radius?: number;
  falloff?: Falloff;
  className?: string;
  style?: CSSProperties;
  /** Words (exact match) that render in the accent colour. */
  accentWords?: string[];
}

const ProximityLetters = forwardRef<HTMLSpanElement, ProximityLettersProps>((props, ref) => {
  const {
    label,
    fromFontVariationSettings,
    toFontVariationSettings,
    containerRef,
    active,
    radius = 50,
    falloff = "linear",
    className = "",
    style,
    accentWords = [],
  } = props;

  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mousePositionRef = usePointerPositionRef(containerRef, active);
  const smoothedPositionRef = useRef({ x: -9999, y: -9999 });
  const lastPositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const reducedMotionRef = useRef(false);
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotionRef.current = mediaQuery.matches;
    };
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (!cancelled) setFontReady(true);
    };
    if (typeof document !== "undefined" && document.fonts?.ready) document.fonts.ready.then(done).catch(done);
    else done();
    return () => {
      cancelled = true;
    };
  }, []);

  // Lock each letter to the wider of its from/to widths so heavier glyphs
  // don't reflow the paragraph.
  useEffect(() => {
    if (!fontReady) return;
    const lock = () => {
      letterRefs.current.forEach((letterRef) => {
        if (!letterRef) return;
        letterRef.style.width = "";
        const prevSettings = letterRef.style.fontVariationSettings;
        letterRef.style.fontVariationSettings = fromFontVariationSettings;
        const fromWidth = letterRef.getBoundingClientRect().width;
        letterRef.style.fontVariationSettings = toFontVariationSettings;
        const toWidth = letterRef.getBoundingClientRect().width;
        letterRef.style.fontVariationSettings = prevSettings;
        letterRef.style.display = "inline-block";
        letterRef.style.textAlign = "center";
        letterRef.style.width = `${Math.max(fromWidth, toWidth)}px`;
      });
    };
    lock();
    window.addEventListener("resize", lock);
    return () => window.removeEventListener("resize", lock);
  }, [fromFontVariationSettings, toFontVariationSettings, label, fontReady]);

  const parsedSettings = useMemo(() => {
    const parseSettings = (settingsStr: string) =>
      new Map(
        settingsStr
          .split(",")
          .map((s) => s.trim())
          .map((s) => {
            const [name, value] = s.split(" ");
            return [name.replace(/['"]/g, ""), parseFloat(value)] as const;
          }),
      );
    const fromSettings = parseSettings(fromFontVariationSettings);
    const toSettings = parseSettings(toFontVariationSettings);
    return Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
      axis,
      fromValue,
      toValue: toSettings.get(axis) ?? fromValue,
    }));
  }, [fromFontVariationSettings, toFontVariationSettings]);

  const calculateFalloff = (distance: number) => {
    const norm = Math.min(Math.max(1 - distance / radius, 0), 1);
    switch (falloff) {
      case "exponential":
        return norm ** 2;
      case "gaussian":
        return Math.exp(-((distance / (radius / 2)) ** 2) / 2);
      default:
        return norm;
    }
  };

  useAnimationFrame(() => {
    if (!containerRef?.current) return;
    const target = mousePositionRef.current;
    const smoothed = smoothedPositionRef.current;
    if (reducedMotionRef.current) {
      smoothed.x = target.x;
      smoothed.y = target.y;
    } else {
      smoothed.x += (target.x - smoothed.x) * 0.18;
      smoothed.y += (target.y - smoothed.y) * 0.18;
    }
    if (
      lastPositionRef.current.x !== null &&
      Math.abs(smoothed.x - lastPositionRef.current.x) < 0.01 &&
      Math.abs(smoothed.y - (lastPositionRef.current.y as number)) < 0.01
    ) {
      return;
    }
    lastPositionRef.current = { x: smoothed.x, y: smoothed.y };
    const containerRect = containerRef.current.getBoundingClientRect();

    letterRefs.current.forEach((letterRef) => {
      if (!letterRef) return;
      const rect = letterRef.getBoundingClientRect();
      const dx = smoothed.x - (rect.left + rect.width / 2 - containerRect.left);
      const dy = smoothed.y - (rect.top + rect.height / 2 - containerRect.top);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance >= radius) {
        letterRef.style.fontVariationSettings = fromFontVariationSettings;
        return;
      }
      const f = calculateFalloff(distance);
      letterRef.style.fontVariationSettings = parsedSettings
        .map(({ axis, fromValue, toValue }) => `'${axis}' ${fromValue + (toValue - fromValue) * f}`)
        .join(", ");
    });
  }, active && fontReady);

  const words = label.split(" ");
  let letterIndex = 0;

  return (
    <span ref={ref} style={{ display: "inline", ...style }} className={className}>
      {words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          aria-hidden="true"
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
          className={accentWords.includes(word) ? "text-mint" : undefined}
        >
          {word.split("").map((letter) => {
            const i = letterIndex++;
            return (
              <span
                key={i}
                ref={(el) => {
                  letterRefs.current[i] = el;
                }}
                style={{ display: "inline-block", fontVariationSettings: fromFontVariationSettings }}
              >
                {letter}
              </span>
            );
          })}
          {wordIndex < words.length - 1 && <span style={{ display: "inline-block" }}>&nbsp;</span>}
        </span>
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
});
ProximityLetters.displayName = "ProximityLetters";

export interface VariableTextProximityProps {
  text: string;
  radius?: number;
  falloff?: Falloff;
  baseWeight?: number;
  hoverWeight?: number;
  baseOpticalSize?: number;
  hoverOpticalSize?: number;
  /** Width axis (Roboto Flex `wdth`, 25–151). */
  baseWidth?: number;
  hoverWidth?: number;
  accentWords?: string[];
  className?: string;
  textClassName?: string;
  as?: "p" | "h2" | "div";
}

export default function VariableTextProximity({
  text,
  radius = 100,
  falloff = "linear",
  baseWeight = 300,
  hoverWeight = 800,
  baseOpticalSize = 9,
  hoverOpticalSize = 40,
  baseWidth = 100,
  hoverWidth = 100,
  accentWords,
  className = "",
  textClassName = "",
  as: Tag = "p",
}: VariableTextProximityProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(stageRef);

  const from = `'wght' ${baseWeight}, 'opsz' ${baseOpticalSize}, 'wdth' ${baseWidth}`;
  const to = `'wght' ${hoverWeight}, 'opsz' ${hoverOpticalSize}, 'wdth' ${hoverWidth}`;

  return (
    <div ref={stageRef} className={`relative ${className}`}>
      <Tag className={textClassName}>
        <ProximityLetters
          label={text}
          fromFontVariationSettings={from}
          toFontVariationSettings={to}
          containerRef={stageRef}
          active={inView}
          radius={radius}
          falloff={falloff}
          accentWords={accentWords}
        />
      </Tag>
    </div>
  );
}
