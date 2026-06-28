"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, type RefObject } from "react";

import type { PlayerContextValue } from "../player/player-context";

const WAVEFORM_BARS = [
  { id: "wf-00", h: 22, dur: 0.72, delay: 0.0 },
  { id: "wf-01", h: 40, dur: 0.65, delay: 0.07 },
  { id: "wf-02", h: 58, dur: 0.81, delay: 0.14 },
  { id: "wf-03", h: 74, dur: 0.6, delay: 0.04 },
  { id: "wf-04", h: 64, dur: 0.89, delay: 0.18 },
  { id: "wf-05", h: 86, dur: 0.7, delay: 0.09 },
  { id: "wf-06", h: 78, dur: 0.55, delay: 0.21 },
  { id: "wf-07", h: 95, dur: 0.76, delay: 0.05 },
  { id: "wf-08", h: 88, dur: 0.83, delay: 0.12 },
  { id: "wf-09", h: 100, dur: 0.67, delay: 0.02 },
  { id: "wf-10", h: 96, dur: 0.79, delay: 0.15 },
  { id: "wf-11", h: 90, dur: 0.58, delay: 0.08 },
  { id: "wf-12", h: 82, dur: 0.91, delay: 0.19 },
  { id: "wf-13", h: 92, dur: 0.69, delay: 0.03 },
  { id: "wf-14", h: 76, dur: 0.77, delay: 0.11 },
  { id: "wf-15", h: 66, dur: 0.62, delay: 0.16 },
  { id: "wf-16", h: 56, dur: 0.85, delay: 0.01 },
  { id: "wf-17", h: 44, dur: 0.73, delay: 0.1 },
  { id: "wf-18", h: 30, dur: 0.66, delay: 0.17 },
  { id: "wf-19", h: 20, dur: 0.79, delay: 0.06 },
] as const;

interface EpisodeAudioPlayerHeaderProps {
  episodeId: string;
  title: string;
  ctx: PlayerContextValue;
  isPageEpisodeActive: boolean;
  progressResumeCaption: string | null;
  waveformRef: RefObject<HTMLDivElement | null>;
  decoderWavePlaying: boolean;
}

export function EpisodeAudioPlayerHeader({
  episodeId,
  title,
  ctx,
  isPageEpisodeActive,
  progressResumeCaption,
  waveformRef,
  decoderWavePlaying,
}: EpisodeAudioPlayerHeaderProps) {
  const t = useTranslations("listen");

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-display text-primary pr-2 text-sm leading-snug font-semibold sm:text-base">
          <span className="bg-accent/12 border-accent/28 text-accent-text mr-2 inline-block rounded-sm border px-1.5 py-0.5 align-middle font-mono text-[10px] tracking-widest sm:text-[11px]">
            {episodeId}
          </span>
          {title}
        </p>
        <div
          className={`text-muted/75 mt-1 flex h-5 max-w-full items-center gap-1 font-mono text-[10px] tracking-wide sm:gap-1.5 sm:text-[11px]${ctx.hasClearableProgress && isPageEpisodeActive && ctx.resumeHintVisible ? "" : " pointer-events-none invisible select-none"}`}
          inert={
            ctx.hasClearableProgress && isPageEpisodeActive && ctx.resumeHintVisible
              ? undefined
              : true
          }
        >
          <output className="line-clamp-1 min-w-0 shrink leading-snug">
            {progressResumeCaption ?? "\u00a0"}
          </output>
          <button
            type="button"
            onClick={ctx.clearProgress}
            disabled={ctx.loadError}
            title={t("playerClearProgress")}
            aria-label={t("playerClearProgressAria")}
            className="text-muted/50 hover:text-muted hover:bg-surface-2/75 focus-visible:ring-secondary/40 -mr-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0"
              aria-hidden
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="square"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={waveformRef}
        className="flex h-10 shrink-0 items-center gap-[2.5px] sm:h-12 sm:gap-[3px]"
        data-waveform-playing={decoderWavePlaying || undefined}
        aria-hidden
      >
        {WAVEFORM_BARS.map((bar) => (
          <span
            key={bar.id}
            className="decoder-waveform-bar decoder-waveform-bar-gradient w-[2.5px] rounded-[1px]"
            style={
              {
                height: `${bar.h}%`,
                "--wave-dur": `${bar.dur}s`,
                "--wave-delay": `${bar.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
