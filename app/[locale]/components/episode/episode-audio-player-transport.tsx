"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties } from "react";

import type { Episode } from "@/lib/episode/catalog";
import { formatPlaybackTime } from "@/lib/player/format-playback-time";

import type { PlayerContextValue } from "../player/player-context";

import { EpisodeAudioPlayerTransportToolbar } from "./episode-audio-player-transport-toolbar";
import type { EpisodeAudioPlayerTransportState } from "./use-episode-audio-player-state";

const SKIP_SEC = 15;

interface PlayPauseButtonProps {
  className: string;
  iconSize: number;
  playing: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}

function PlayPauseButton({
  className,
  iconSize,
  playing,
  disabled,
  onClick,
  label,
}: PlayPauseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-state={playing ? "playing" : "paused"}
      className={`decoder-play-btn shrink-0 items-center justify-center rounded-sm ${className}`}
      aria-label={label}
    >
      {playing ? (
        <svg
          width={iconSize - 2}
          height={iconSize - 2}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
        </svg>
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className="translate-x-px"
        >
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      )}
    </button>
  );
}

interface EpisodeAudioPlayerTransportProps {
  episode: Episode;
  ctx: PlayerContextValue;
  isPageEpisodeActive: boolean;
  transport: EpisodeAudioPlayerTransportState;
}

export function EpisodeAudioPlayerTransport({
  episode,
  ctx,
  isPageEpisodeActive,
  transport,
}: EpisodeAudioPlayerTransportProps) {
  const t = useTranslations("listen");
  const { loadEpisode, seek } = ctx;
  const {
    displayPosition,
    timelineDuration,
    progressPct,
    chapterTimelineMarkers,
    activeChapterStartT,
    activeChapterLabel,
    showSeekBuffering,
    mainTransportShowsPause,
    rateLabel,
    volumeIconLevel,
    copyStatus,
    copyEpisodeLink,
    progressInputRef,
    scrubPosition,
    pointerScrubbingRef,
    onProgressPointerDown,
    onProgressChange,
    onProgressCommit,
    commitProgressAfterPointer,
    onMainPlayPause,
  } = transport;

  const playPauseLabel = mainTransportShowsPause
    ? t("playerPause")
    : isPageEpisodeActive
      ? t("playerPlay")
      : t("playerPlayThisEpisode");

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 space-y-2 sm:order-2 sm:flex-1 sm:space-y-2.5">
          <div className="flex items-baseline justify-between gap-4 font-mono text-[11px] tabular-nums sm:text-xs">
            <p className="shrink-0 tracking-widest">
              <span className="text-primary">{formatPlaybackTime(displayPosition)}</span>
              <span className="text-muted"> / {formatPlaybackTime(timelineDuration)}</span>
            </p>
            {activeChapterLabel ? (
              <p className="text-muted min-w-0 truncate text-right" title={activeChapterLabel}>
                {activeChapterLabel}
              </p>
            ) : null}
          </div>

          <div
            className="decoder-audio-seek-wrap relative w-full"
            aria-busy={showSeekBuffering}
            style={
              {
                "--decoder-progress": `${progressPct}%`,
                "--decoder-buffered": `${Math.max(progressPct, ctx.bufferedPct)}%`,
              } as CSSProperties
            }
          >
            {showSeekBuffering ? (
              <output className="sr-only" aria-live="polite">
                {t("playerSeekBuffering")}
              </output>
            ) : null}
            <div className="decoder-audio-custom-track absolute inset-x-0" aria-hidden />
            {chapterTimelineMarkers.length > 0 ? (
              <div className="decoder-audio-chapter-ticks absolute inset-0" aria-hidden>
                {chapterTimelineMarkers.map((m) => {
                  const isPast = m.pct < progressPct - 0.02;
                  const isCurrent =
                    activeChapterStartT != null && Math.abs(m.t - activeChapterStartT) < 0.03;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        if (!isPageEpisodeActive) loadEpisode(episode);
                        seek(m.t);
                      }}
                      className={`decoder-chapter-tick${isPast ? " decoder-chapter-tick--past" : ""}${isCurrent ? " decoder-chapter-tick--current" : ""}`}
                      style={{ left: `${m.pct}%` }}
                    >
                      <span className="decoder-chapter-tick__cue" />
                      <span className="decoder-chapter-tick__tooltip">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <input
              ref={progressInputRef}
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progressPct}
              disabled={ctx.loadError || timelineDuration <= 0}
              onPointerDown={onProgressPointerDown}
              onChange={(e) => onProgressChange(Number(e.target.value))}
              onPointerUp={commitProgressAfterPointer}
              onPointerCancel={commitProgressAfterPointer}
              onBlur={() => {
                if (pointerScrubbingRef.current || scrubPosition !== null) {
                  pointerScrubbingRef.current = false;
                  onProgressCommit();
                }
              }}
              className="decoder-audio-progress w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={t("playerSeek")}
            />
          </div>
        </div>

        <div className="shrink-0 sm:order-1">
          <div className="flex items-center justify-center gap-3 sm:hidden">
            <button
              type="button"
              onClick={() => ctx.skip(-SKIP_SEC)}
              disabled={ctx.loadError || !isPageEpisodeActive || timelineDuration <= 0}
              className="border-edge text-muted hover:border-secondary/40 hover:text-primary active:bg-surface-2 flex size-12 shrink-0 items-center justify-center gap-1 rounded-sm border transition-colors disabled:pointer-events-none disabled:opacity-35"
              aria-label={t("playerSkipBack")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11 18V6l-8.5 6 8.5 6zm1-6l8.5 6V6l-8.5 6z" />
              </svg>
              <span className="font-mono text-[10px] tracking-widest">{SKIP_SEC}</span>
            </button>

            <PlayPauseButton
              className="flex size-16"
              iconSize={22}
              playing={mainTransportShowsPause}
              disabled={ctx.loadError}
              onClick={onMainPlayPause}
              label={playPauseLabel}
            />

            <button
              type="button"
              onClick={() => ctx.skip(SKIP_SEC)}
              disabled={ctx.loadError || !isPageEpisodeActive || timelineDuration <= 0}
              className="border-edge text-muted hover:border-secondary/40 hover:text-primary active:bg-surface-2 flex size-12 shrink-0 items-center justify-center gap-1 rounded-sm border transition-colors disabled:pointer-events-none disabled:opacity-35"
              aria-label={t("playerSkipForward")}
            >
              <span className="font-mono text-[10px] tracking-widest">{SKIP_SEC}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
              </svg>
            </button>
          </div>

          <PlayPauseButton
            className="hidden size-14 sm:flex"
            iconSize={20}
            playing={mainTransportShowsPause}
            disabled={ctx.loadError}
            onClick={onMainPlayPause}
            label={playPauseLabel}
          />
        </div>
      </div>

      <EpisodeAudioPlayerTransportToolbar
        ctx={ctx}
        isPageEpisodeActive={isPageEpisodeActive}
        rateLabel={rateLabel}
        volumeIconLevel={volumeIconLevel}
        copyStatus={copyStatus}
        copyEpisodeLink={copyEpisodeLink}
        timelineDuration={timelineDuration}
      />

      <details className="group border-edge/50 mt-0.5 hidden border-t pt-3 sm:block">
        <summary className="text-muted/55 hover:text-muted flex cursor-pointer list-none items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors select-none [&::-webkit-details-marker]:hidden">
          <span
            className="border-edge/70 text-muted/90 inline-flex size-5 items-center justify-center rounded-sm border text-[11px] font-semibold"
            aria-hidden
          >
            ?
          </span>
          {t("playerShortcutsHint")}
        </summary>
        <ul className="text-muted/75 mt-2.5 list-none space-y-1.5 pl-0.5 font-mono text-[10px] tracking-wide sm:text-[11px]">
          <li>{t("playerShortcutPlayPause")}</li>
          <li>{t("playerShortcutSeek")}</li>
          <li>{t("playerShortcutRate")}</li>
        </ul>
      </details>
    </>
  );
}
