"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties } from "react";

import { formatPlaybackTime } from "@/lib/format-playback-time";

import type { PlayerContextValue } from "../player/player-context";
import { VolumeIcon } from "../player/volume-icon";

const SKIP_SEC = 15;

interface EpisodeAudioPlayerTransportToolbarProps {
  ctx: PlayerContextValue;
  isPageEpisodeActive: boolean;
  timelineDuration: number;
  rateLabel: string;
  volumeIconLevel: number;
  copyStatus: "idle" | "copied" | "error";
  copyEpisodeLink: () => Promise<void>;
}

export function EpisodeAudioPlayerTransportToolbar({
  ctx,
  isPageEpisodeActive,
  timelineDuration,
  rateLabel,
  volumeIconLevel,
  copyStatus,
  copyEpisodeLink,
}: EpisodeAudioPlayerTransportToolbarProps) {
  const t = useTranslations("listen");
  const { programmaticVolume } = ctx;

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:contents">
          <button
            type="button"
            onClick={() => ctx.skip(-SKIP_SEC)}
            disabled={ctx.loadError || !isPageEpisodeActive || timelineDuration <= 0}
            className="decoder-audio-chip inline-flex"
            aria-label={t("playerSkipBack")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 18V6l-8.5 6 8.5 6zm1-6l8.5 6V6l-8.5 6z" />
            </svg>
            <span className="font-mono text-[10px] tracking-widest">{SKIP_SEC}</span>
          </button>
          <button
            type="button"
            onClick={() => ctx.skip(SKIP_SEC)}
            disabled={ctx.loadError || !isPageEpisodeActive || timelineDuration <= 0}
            className="decoder-audio-chip inline-flex"
            aria-label={t("playerSkipForward")}
          >
            <span className="font-mono text-[10px] tracking-widest">{SKIP_SEC}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
            </svg>
          </button>
        </div>

        <div className="border-edge/60 flex h-11 w-full overflow-hidden rounded-sm border bg-[color-mix(in_srgb,var(--surface-2)_88%,transparent)] sm:hidden">
          <button
            type="button"
            onClick={ctx.cycleRate}
            disabled={ctx.loadError}
            className="hover:bg-surface-2/60 active:bg-surface-2 flex flex-1 items-center justify-center transition-colors disabled:opacity-35"
            aria-label={t("playerPlaybackRateAria", { rate: rateLabel })}
          >
            <span className="text-muted font-mono text-[11px] tracking-widest tabular-nums">
              {rateLabel}
            </span>
          </button>
          <span className="bg-edge/50 w-px self-stretch" aria-hidden />
          {!programmaticVolume ? (
            <>
              <button
                type="button"
                onClick={ctx.toggleMute}
                disabled={ctx.loadError}
                className="text-muted hover:bg-surface-2/60 active:bg-surface-2 flex w-[2.75rem] shrink-0 items-center justify-center transition-colors disabled:opacity-35"
                aria-label={ctx.muted || ctx.volume === 0 ? t("playerUnmute") : t("playerMute")}
              >
                <VolumeIcon muted={ctx.muted} volume={volumeIconLevel} />
              </button>
              <span className="bg-edge/50 w-px self-stretch" aria-hidden />
            </>
          ) : null}
          <button
            type="button"
            onClick={copyEpisodeLink}
            disabled={ctx.loadError || !isPageEpisodeActive}
            className="hover:bg-surface-2/60 active:bg-surface-2 flex flex-1 items-center justify-center gap-1.5 transition-colors disabled:opacity-35"
            aria-label={t("playerCopyMomentAria", {
              time: formatPlaybackTime(ctx.currentTime),
            })}
          >
            {copyStatus === "copied" ? (
              <span className="text-accent-text font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("playerCopied")}
              </span>
            ) : copyStatus === "error" ? (
              <span className="text-secondary font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("playerCopyFailed")}
              </span>
            ) : (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-accent-text shrink-0"
                  aria-hidden
                >
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                </svg>
                <span className="text-primary font-mono text-[11px] tracking-[0.06em] tabular-nums">
                  {formatPlaybackTime(ctx.currentTime)}
                </span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={ctx.cycleRate}
          disabled={ctx.loadError}
          className="decoder-audio-chip hidden w-[4rem] justify-center sm:inline-flex"
          aria-label={t("playerPlaybackRateAria", { rate: rateLabel })}
        >
          <span className="font-mono text-[10px] tracking-widest tabular-nums">{rateLabel}</span>
        </button>

        {!programmaticVolume ? (
          <button
            type="button"
            onClick={ctx.toggleMute}
            disabled={ctx.loadError}
            className="decoder-audio-chip hidden w-[2.75rem] shrink-0 justify-center sm:inline-flex"
            aria-label={ctx.muted || ctx.volume === 0 ? t("playerUnmute") : t("playerMute")}
          >
            <VolumeIcon muted={ctx.muted} volume={volumeIconLevel} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={copyEpisodeLink}
          disabled={ctx.loadError || !isPageEpisodeActive}
          className="decoder-audio-chip decoder-audio-moment-link border-primary/10 from-surface-2 relative hidden min-w-[9.5rem] overflow-hidden bg-gradient-to-br to-transparent px-2.5 py-1.5 pl-2 sm:inline-flex"
          aria-label={t("playerCopyMomentAria", {
            time: formatPlaybackTime(ctx.currentTime),
          })}
        >
          <span
            className="bg-accent absolute top-0 bottom-0 left-0 w-px opacity-90"
            aria-hidden
          />
          <span
            className="border-edge/80 text-accent-text flex size-7 shrink-0 items-center justify-center rounded-[3px] border bg-[color-mix(in_srgb,var(--surface-2)_92%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--primary)_8%,transparent)]"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 text-left">
            {copyStatus === "copied" ? (
              <span className="text-accent-text font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("playerCopied")}
              </span>
            ) : copyStatus === "error" ? (
              <span className="text-secondary font-mono text-[10px] tracking-[0.16em] uppercase">
                {t("playerCopyFailed")}
              </span>
            ) : (
              <>
                <span className="text-muted/55 mb-0.5 block font-mono text-[8px] tracking-[0.2em] uppercase sm:text-[9px]">
                  {t("playerCopyMomentKicker")}
                </span>
                <span className="text-primary font-mono text-[11px] leading-none tracking-[0.06em] tabular-nums sm:text-xs">
                  {formatPlaybackTime(ctx.currentTime)}
                </span>
              </>
            )}
          </span>
        </button>

        {programmaticVolume ? (
          <div className="hidden sm:ml-auto sm:flex sm:min-w-[min(100%,12rem)] sm:flex-1 sm:items-center sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={ctx.toggleMute}
              disabled={ctx.loadError}
              className="border-edge text-muted hover:border-secondary/40 hover:text-primary active:bg-surface-2 flex size-11 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-35"
              aria-label={ctx.muted || ctx.volume === 0 ? t("playerUnmute") : t("playerMute")}
            >
              <VolumeIcon muted={ctx.muted} volume={volumeIconLevel} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={ctx.muted ? 0 : ctx.volume}
              disabled={ctx.loadError}
              onChange={(e) => {
                ctx.setVolume(Number(e.target.value));
              }}
              className="decoder-audio-volume flex-1 disabled:opacity-35 sm:max-w-[10rem]"
              style={
                { "--decoder-vol": `${(ctx.muted ? 0 : ctx.volume) * 100}%` } as CSSProperties
              }
              aria-label={t("playerVolume")}
            />
          </div>
        ) : null}
      </div>

      {programmaticVolume ? (
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={ctx.toggleMute}
            disabled={ctx.loadError}
            className="border-edge text-muted hover:border-secondary/40 hover:text-primary active:bg-surface-2 flex size-11 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-35"
            aria-label={ctx.muted || ctx.volume === 0 ? t("playerUnmute") : t("playerMute")}
          >
            <VolumeIcon muted={ctx.muted} volume={volumeIconLevel} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={ctx.muted ? 0 : ctx.volume}
            disabled={ctx.loadError}
            onChange={(e) => {
              ctx.setVolume(Number(e.target.value));
            }}
            className="decoder-audio-volume flex-1 disabled:opacity-35"
            style={{ "--decoder-vol": `${(ctx.muted ? 0 : ctx.volume) * 100}%` } as CSSProperties}
            aria-label={t("playerVolume")}
          />
        </div>
      ) : null}
    </>
  );
}
