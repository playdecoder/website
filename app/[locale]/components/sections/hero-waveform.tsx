"use client";

import { useHeroWaveformEffect } from "@/lib/react/browser-external-store";

import { HeroWaveformBars } from "./hero-waveform-bars";
import { HeroWaveformOsc } from "./hero-waveform-osc";

export function HeroWaveform() {
  const effect = useHeroWaveformEffect();
  return effect === "bars" ? <HeroWaveformBars key="bars" /> : <HeroWaveformOsc key="osc" />;
}
