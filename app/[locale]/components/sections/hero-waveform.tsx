"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { barColorCss, heroWaveformBars } from "@/lib/episode-catalog";
import { scaleHeroWaveTime } from "@/lib/hero-waveform-timing";

export function HeroWaveform() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const onVisibility = () => {
      setTabVisible(document.visibilityState !== "hidden");
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { root: null, rootMargin: "96px 0px 96px 0px", threshold: 0 },
    );

    io.observe(el);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

  const paused = !inView || !tabVisible;

  return (
    <div className="mb-12 w-full max-md:px-4 md:px-0">
      <div
        ref={rootRef}
        className="hero-waveform flex w-full max-w-full items-end justify-center gap-px md:gap-[3px]"
        style={{ height: 200 }}
        aria-hidden
        data-motion-state={paused ? "paused" : "running"}
      >
        {heroWaveformBars.map((bar, i) => (
          <div
            key={i}
            className="hero-waveform__bar w-[3px] shrink-0 sm:w-1 md:w-[6px]"
            data-color={bar.color}
            data-alt={bar.alt ? "true" : undefined}
            style={
              {
                height: bar.h,
                background: barColorCss[bar.color],
                "--duration": scaleHeroWaveTime(bar.dur),
                "--delay": scaleHeroWaveTime(bar.delay),
                "--idx": i,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
