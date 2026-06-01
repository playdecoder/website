import type { CSSProperties } from "react";

import { type Episode, barColorCss, listenBackgroundBarsForEpisode } from "@/lib/episode/catalog";
import { scaleListenWaveDuration } from "@/lib/ui/hero-waveform-timing";

interface EpisodeListenDecorationsProps {
  episode: Episode;
  seed: number;
  bloomX: number;
  bloomY: number;
  bloom2X: number;
  bloom2Y: number;
}

export function EpisodeListenDecorations({
  episode,
  seed,
  bloomX,
  bloomY,
  bloom2X,
  bloom2Y,
}: EpisodeListenDecorationsProps) {
  const bars = listenBackgroundBarsForEpisode(episode.id);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-90 dark:opacity-100"
          style={{
            background: [
              `radial-gradient(ellipse 80% 55% at ${bloomX}% ${bloomY}%, color-mix(in srgb, var(--secondary) 11%, transparent), transparent 58%)`,
              `radial-gradient(ellipse 70% 50% at ${bloom2X}% ${bloom2Y}%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 52%)`,
            ].join(", "),
          }}
        />
      </div>

      <div
        className="listen-page-wave-layer pointer-events-none fixed inset-0 z-[1] flex items-end overflow-hidden select-none"
        aria-hidden
      >
        <div className="flex h-full min-h-0 w-full items-end gap-px px-0.5 opacity-[0.085] sm:gap-0.5 sm:px-2 dark:opacity-[0.055]">
          {bars.map((bar) => (
            <div
              key={`${episode.id}-${bar.h}-${bar.dur}-${bar.delay}-${bar.color}-${bar.motion}-${bar.flexGrow}-${bar.ease}`}
              className="waveform-bar waveform-bar--listen-bg max-w-[3.5vw] min-w-0"
              data-motion={String(bar.motion)}
              style={
                {
                  flex: `${bar.flexGrow} 1 0`,
                  height: `max(6px, min(22rem, ${(bar.h / 200) * 58}vh))`,
                  background: barColorCss[bar.color],
                  "--duration": bar.dur,
                  "--delay": bar.delay,
                  "--listen-wave-dur": scaleListenWaveDuration(bar.dur),
                  "--listen-ease": bar.ease,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[2] flex items-start justify-center overflow-hidden pt-20 select-none sm:pt-24 md:pt-28"
        aria-hidden
      >
        <span
          className="font-display text-edge/[0.12] dark:text-edge/[0.065] max-w-[100vw] px-2 leading-none font-extrabold tracking-tighter whitespace-nowrap"
          style={{
            fontSize: "clamp(2.75rem, 18vw, 16rem)",
            transform: `translateX(clamp(-4%, ${(seed % 5) - 2}%, 4%)) rotate(${(seed % 3) - 1}deg)`,
          }}
        >
          {episode.id}
        </span>
      </div>
    </>
  );
}
