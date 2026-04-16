"use client";

import { useEffect, useState } from "react";

import { HeroWaveformBars } from "./hero-waveform-bars";
import { HeroWaveformOsc }  from "./hero-waveform-osc";

function useHeroEffect(): "osc" | "bars" {
  const [effect, setEffect] = useState<"osc" | "bars">("osc");

  useEffect(() => {
    const read = () =>
      setEffect(window.location.hash.includes("hero-effect=bars") ? "bars" : "osc");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return effect;
}

export function HeroWaveform() {
  const effect = useHeroEffect();
  return effect === "bars" ? <HeroWaveformBars key="bars" /> : <HeroWaveformOsc key="osc" />;
}
