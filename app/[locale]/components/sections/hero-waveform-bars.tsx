"use client";

import type { CSSProperties } from "react";
import { useRef } from "react";

import {
  useDocumentTabVisible,
  useHeroWaveInView,
} from "@/lib/browser-external-store";
import { barColorCss, heroWaveformBars } from "@/lib/episode-catalog";
import { scaleHeroWaveTime } from "@/lib/hero-waveform-timing";

export function HeroWaveformBars() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useHeroWaveInView(rootRef);
  const tabVisible = useDocumentTabVisible();

  return (
    <div className="mb-12 w-full max-md:px-4 md:px-0">
      <div
        ref={rootRef}
        className="hero-waveform flex w-full max-w-full items-end justify-center gap-px md:gap-[3px]"
        style={{ height: 200 }}
        aria-hidden
        data-motion-state={!inView || !tabVisible ? "paused" : "running"}
      >
        {heroWaveformBars.map((bar, i) => (
          <div
            key={`${bar.h}-${bar.dur}-${bar.delay}-${bar.color}-${bar.alt ? "1" : "0"}`}
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
