"use client";

import { useTranslations } from "next-intl";
import { type ReactNode } from "react";

import type { Episode } from "@/lib/episode-catalog";
import type { EpisodeHashChapter } from "@/lib/episode-hash";

import { EpisodeAudioPlayerHeader } from "./episode-audio-player-header";
import { EpisodeAudioPlayerLoadError } from "./episode-audio-player-load-error";
import { EpisodeAudioPlayerTransport } from "./episode-audio-player-transport";
import { EpisodePlayerArtBackground } from "./episode-player-art-background.client";
import { PLAYER_ART_SHELL_CLASS, episodeHasPlayerArt } from "./episode-player-art.constants";
import { useEpisodeAudioPlayerState } from "./use-episode-audio-player-state";

interface EpisodeAudioPlayerProps {
  episode: Episode;
  chapters?: EpisodeHashChapter[];
  /** Server-rendered art layer for first paint on the listen page. */
  artBackground?: ReactNode;
}

export function EpisodeAudioPlayer({ episode, chapters, artBackground }: EpisodeAudioPlayerProps) {
  const t = useTranslations("listen");
  const {
    ctx,
    episodeId,
    title,
    isPageEpisodeActive,
    progressResumeCaption,
    waveformRef,
    decoderWavePlaying,
    transport,
  } = useEpisodeAudioPlayerState(episode, chapters);

  const hasArt = episodeHasPlayerArt(episode.artImage);

  return (
    <section
      className={`decoder-audio-player relative overflow-hidden rounded-sm border duration-300 motion-safe:transition-[border-color,box-shadow] ${
        ctx.loadError
          ? hasArt
            ? `border-secondary/40 ${PLAYER_ART_SHELL_CLASS.audio.sectionLoadError} shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--secondary)_8%,transparent)]`
            : "border-secondary/40 bg-surface/90 dark:bg-surface/60 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--secondary)_8%,transparent)] backdrop-blur-md"
          : hasArt
            ? `border-edge ${PLAYER_ART_SHELL_CLASS.audio.section} hover:border-secondary/35 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--secondary)_12%,transparent)]`
            : "border-edge bg-surface/85 dark:bg-surface/55 backdrop-blur-md hover:border-secondary/35 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--secondary)_12%,transparent)]"
      }`}
      style={{ animation: "fadeUp 0.7s ease both 0.18s" }}
      data-playing={isPageEpisodeActive && ctx.isPlaying}
      data-seek-buffering={transport.showSeekBuffering || undefined}
      data-load-error={ctx.loadError || undefined}
      aria-label={t("playerAriaLabel", { id: episodeId })}
    >
      <div
        className="dot-grid pointer-events-none absolute inset-0 opacity-[0.2] dark:opacity-[0.35]"
        aria-hidden
      />
      {!hasArt ? (
        <div
          className={`pointer-events-none absolute top-0 right-0 left-0 bg-gradient-to-r from-transparent to-transparent transition-all duration-500 ease-out ${ctx.isPlaying ? "h-[2px] via-accent/80" : "h-px via-secondary/25"}`}
          aria-hidden
        />
      ) : null}

      {hasArt ? (
        <div className={PLAYER_ART_SHELL_CLASS.audio.frost} aria-hidden />
      ) : null}

      {artBackground ?? (
        <EpisodePlayerArtBackground artImage={episode.artImage} fade="gradient" />
      )}

      <div className="relative p-4 sm:p-5 md:p-6 flex flex-col gap-4 sm:gap-5">
        <EpisodeAudioPlayerHeader
          episodeId={episodeId}
          title={title}
          ctx={ctx}
          isPageEpisodeActive={isPageEpisodeActive}
          progressResumeCaption={progressResumeCaption}
          waveformRef={waveformRef}
          decoderWavePlaying={decoderWavePlaying}
        />

        {ctx.loadError ? <EpisodeAudioPlayerLoadError /> : null}

        <EpisodeAudioPlayerTransport
          episode={episode}
          ctx={ctx}
          isPageEpisodeActive={isPageEpisodeActive}
          transport={transport}
        />
      </div>
    </section>
  );
}
