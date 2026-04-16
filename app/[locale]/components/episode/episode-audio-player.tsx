"use client";

import { useQueryState } from "nuqs";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { Episode } from "@/lib/episode-catalog";
import type { EpisodeHashChapter } from "@/lib/episode-hash";
import { resolveEpisodeSeekFromHash } from "@/lib/episode-hash";
import { getSavedPosition } from "@/lib/episode-progress-storage";
import { formatEpisodeTimeHash } from "@/lib/episode-time-fragment";
import { formatPlaybackTime } from "@/lib/format-playback-time";
import {
  LISTEN_AUTOPLAY_QUERY_KEY,
  parseAsListenAutoplay,
} from "@/lib/listen-autoplay-query";

import { usePlayerContext } from "../player/player-context";
import { useWaveformSettle } from "../player/use-waveform-settle";
import { VolumeIcon } from "../player/volume-icon";

const SKIP_SEC = 15;

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


export interface EpisodeAudioPlayerHandle {
  seekToSeconds: (seconds: number) => void;
}

interface EpisodeAudioPlayerProps {
  episode: Episode;
  chapters?: EpisodeHashChapter[];
}


export const EpisodeAudioPlayer = forwardRef<EpisodeAudioPlayerHandle, EpisodeAudioPlayerProps>(
  function EpisodeAudioPlayer({ episode, chapters }, ref) {
    const t = useTranslations("listen");
    const ctx = usePlayerContext();
    const { seek, loadEpisode, togglePlay, episode: ctxEpisode, audioRef } = ctx;
    const episodeId = episode.id;
    const title = episode.title;
    const isPageEpisodeActive = ctxEpisode?.id === episodeId;

    const waveformRef = useRef<HTMLDivElement>(null);
    const hashHandledRef = useRef(false);
    const [playOnOpen, setPlayOnOpen] = useQueryState(
      LISTEN_AUTOPLAY_QUERY_KEY,
      parseAsListenAutoplay,
    );
    const durationForHashRef = useRef(ctx.duration);
    useEffect(() => {
      durationForHashRef.current = ctx.duration;
    }, [ctx.duration]);

    const { programmaticVolume } = ctx;
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

    const progressResumeCaption = useMemo(() => {
      if (!isPageEpisodeActive || !ctx.resumeHintVisible || !ctx.hasClearableProgress) {
        return null;
      }
      if (ctx.resumeNotice) {
        return ctx.resumeNotice;
      }
      if (!episodeId || ctx.duration <= 0) {
        return null;
      }
      const saved = getSavedPosition(episodeId, ctx.duration);
      if (saved !== null) {
        return t("playerResumingFrom", { time: formatPlaybackTime(saved) });
      }
      return t("playerSavedPlace");
    }, [
      isPageEpisodeActive,
      ctx.resumeHintVisible,
      ctx.hasClearableProgress,
      ctx.resumeNotice,
      ctx.duration,
      episodeId,
      t,
    ]);

    const [scrubPosition, setScrubPosition] = useState<number | null>(null);
    const scrubValueRef = useRef(0);

    const displayPosition = isPageEpisodeActive ? (scrubPosition ?? ctx.currentTime) : 0;
    const timelineDuration = isPageEpisodeActive ? ctx.duration : 0;
    const progressPct = useMemo(() => {
      if (timelineDuration <= 0) return 0;
      return Math.min(100, Math.max(0, (displayPosition / timelineDuration) * 100));
    }, [displayPosition, timelineDuration]);

    const chapterTimelineMarkers = useMemo(() => {
      if (!chapters?.length || timelineDuration <= 0) return [];
      const d = timelineDuration;
      const padStart = 0.85;
      const padEnd = 0.65;
      return chapters
        .filter((ch) => ch.t >= padStart && ch.t <= d - padEnd)
        .map((ch, i) => {
          const pct = Math.min(100, Math.max(0, (ch.t / d) * 100));
          return {
            t: ch.t,
            pct,
            label: ch.label,
            key: `ch-mark-${ch.t}-${i}-${ch.label}`,
          };
        });
    }, [chapters, timelineDuration]);

    const activeChapterStartT = useMemo(() => {
      if (!chapters?.length || timelineDuration <= 0) return null;
      const sorted = [...chapters].sort((a, b) => a.t - b.t);
      let start: number | null = null;
      for (const ch of sorted) {
        if (ch.t <= displayPosition + 0.25) start = ch.t;
      }
      return start;
    }, [chapters, displayPosition, timelineDuration]);

    const rateLabel = ctx.playbackRate === 1 ? "1×" : `${ctx.playbackRate}×`;
    const volumeIconLevel = programmaticVolume ? ctx.volume : ctx.muted ? 0 : 1;
    const mainTransportShowsPause = isPageEpisodeActive && ctx.isPlaying;
    const showSeekBuffering = isPageEpisodeActive && ctx.isSeekBuffering && !ctx.loadError;

    useImperativeHandle(
      ref,
      () => ({
        seekToSeconds: (seconds: number) => seek(seconds),
      }),
      [seek],
    );

    const onMainPlayPause = useCallback(() => {
      if (ctxEpisode?.id !== episode.id) {
        loadEpisode(episode);
      }
      togglePlay();
    }, [ctxEpisode?.id, episode, loadEpisode, togglePlay]);

    const decoderWavePlaying = useWaveformSettle(
      isPageEpisodeActive && ctx.isPlaying && !ctx.isSeekBuffering,
      () => Array.from(waveformRef.current?.querySelectorAll<HTMLElement>(".decoder-waveform-bar") ?? []),
    );

    useEffect(() => {
      if (!isPageEpisodeActive || ctx.duration <= 0 || hashHandledRef.current) return;
      hashHandledRef.current = true;

      const resolved = resolveEpisodeSeekFromHash(
        window.location.hash,
        chapters ?? [],
        ctx.duration,
      );
      if (resolved.seconds === null) return;

      const notice = resolved.fromChapter
        ? t("playerResumeFromChapter", {
            label: resolved.chapterLabel ?? "",
            time: formatPlaybackTime(resolved.seconds),
          })
        : t("playerResumeFromShare", { time: formatPlaybackTime(resolved.seconds) });

      seek(resolved.seconds, notice);

      if (playOnOpen) {
        void setPlayOnOpen(null);
        if (audioRef.current?.paused) {
          togglePlay();
        }
      }
    }, [
      isPageEpisodeActive,
      ctx.duration,
      chapters,
      t,
      seek,
      togglePlay,
      audioRef,
      playOnOpen,
      setPlayOnOpen,
    ]);

    useEffect(() => {
      const onHashChange = () => {
        if (ctxEpisode?.id !== episodeId) return;
        const d = durationForHashRef.current;
        if (d <= 0) return;
        const resolved = resolveEpisodeSeekFromHash(window.location.hash, chapters ?? [], d);
        if (resolved.seconds === null) return;
        seek(resolved.seconds);
      };
      window.addEventListener("hashchange", onHashChange);
      return () => window.removeEventListener("hashchange", onHashChange);
    }, [seek, chapters, ctxEpisode?.id, episodeId]);

    const onProgressChange = (v: number) => {
      scrubValueRef.current = v;
      if (timelineDuration > 0) {
        setScrubPosition((v / 100) * timelineDuration);
      }
    };

    const onProgressCommit = () => {
      if (timelineDuration > 0) {
        seek((scrubValueRef.current / 100) * timelineDuration);
      }
      setScrubPosition(null);
    };

    const copyEpisodeLink = async () => {
      if (!isPageEpisodeActive) return;
      try {
        const url = new URL(window.location.href);
        url.hash = formatEpisodeTimeHash(ctx.currentTime);
        await navigator.clipboard.writeText(url.toString());
        setCopyStatus("copied");
        window.setTimeout(() => setCopyStatus("idle"), 2000);
      } catch {
        setCopyStatus("error");
        window.setTimeout(() => setCopyStatus("idle"), 2800);
      }
    };

    return (
      <section
        className={`decoder-audio-player relative overflow-hidden rounded-sm border backdrop-blur-md duration-300 motion-safe:transition-[border-color,box-shadow] ${
          ctx.loadError
            ? "border-secondary/40 bg-surface/90 dark:bg-surface/60 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--secondary)_8%,transparent)]"
            : "border-edge bg-surface/85 dark:bg-surface/55 hover:border-secondary/35 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--secondary)_12%,transparent)]"
        }`}
        style={{ animation: "fadeUp 0.7s ease both 0.18s" }}
        data-playing={isPageEpisodeActive && ctx.isPlaying}
        data-seek-buffering={showSeekBuffering || undefined}
        data-load-error={ctx.loadError || undefined}
        aria-label={t("playerAriaLabel", { id: episodeId })}
      >
        <div
          className="dot-grid pointer-events-none absolute inset-0 opacity-[0.2] dark:opacity-[0.35]"
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent to-transparent transition-all duration-500 ease-out ${ctx.isPlaying ? "via-accent/55" : "via-secondary/30"}`}
          aria-hidden
        />

        <div className="relative p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-muted mb-1 font-mono text-[10px] tracking-[0.22em] uppercase sm:text-[11px]">
                  {t("playerKicker")}
                </p>
                <p className="font-display text-primary line-clamp-2 pr-2 text-sm leading-snug font-semibold sm:text-base">
                  <span className="text-accent-text mr-2 font-mono text-xs tracking-widest sm:text-sm">
                    {episodeId}
                  </span>
                  {title}
                </p>
                <div
                  className={`text-muted/75 mt-1 flex h-5 max-w-full items-center gap-1 font-mono text-[10px] tracking-wide sm:gap-1.5 sm:text-[11px]${ctx.hasClearableProgress && isPageEpisodeActive && ctx.resumeHintVisible ? "" : " invisible pointer-events-none select-none"}`}
                  aria-hidden={!(ctx.hasClearableProgress && isPageEpisodeActive && ctx.resumeHintVisible) || undefined}
                >
                  <p className="min-w-0 shrink leading-snug line-clamp-1" role="status">
                    {progressResumeCaption ?? "\u00a0"}
                  </p>
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
                className="flex h-8 shrink-0 items-center gap-[2px] sm:h-10 sm:gap-[3px]"
                data-waveform-playing={decoderWavePlaying || undefined}
                aria-hidden
              >
                {WAVEFORM_BARS.map((bar) => (
                  <span
                    key={bar.id}
                    className="decoder-waveform-bar bg-secondary w-[2px] rounded-[1px]"
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

            {ctx.loadError ? (
              <div
                className="border-secondary/25 relative overflow-hidden rounded-sm border bg-[linear-gradient(105deg,color-mix(in_srgb,var(--secondary)_7%,transparent)_0%,transparent_42%,transparent_100%)] dark:bg-[linear-gradient(105deg,color-mix(in_srgb,var(--secondary)_12%,transparent)_0%,transparent_45%,transparent_100%)]"
                role="alert"
              >
                <div
                  className="from-secondary/90 via-secondary/50 to-secondary/20 absolute top-0 bottom-0 left-0 w-0.5 bg-gradient-to-b"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-12deg,transparent,transparent_3px,color-mix(in_srgb,var(--secondary)_50%,transparent)_3px,color-mix(in_srgb,var(--secondary)_50%,transparent)_4px)] opacity-[0.07] motion-reduce:hidden dark:opacity-[0.12]"
                  aria-hidden
                />
                <div className="relative flex gap-3 py-3 pr-3 pl-3.5 sm:gap-4 sm:py-3.5 sm:pl-4">
                  <span
                    className="border-secondary/30 bg-bg/60 dark:bg-bg/25 text-secondary flex size-9 shrink-0 items-center justify-center rounded-sm border"
                    aria-hidden
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="opacity-95"
                    >
                      <path
                        d="M5 17V7M10 17v-6M10 5v1M15 17V7M19 19L5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0 space-y-1.5 pt-0.5">
                    <p className="text-secondary font-mono text-[9px] tracking-[0.22em] uppercase sm:text-[10px]">
                      {t("playerLoadErrorKicker")}
                    </p>
                    <p className="text-primary font-mono text-[11px] leading-[1.65] tracking-[0.02em] sm:text-xs">
                      {t("playerLoadError")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 space-y-2 sm:order-2 sm:flex-1 sm:space-y-2.5">
                <div className="text-muted grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 font-mono text-[11px] tracking-widest tabular-nums sm:text-xs">
                  <span className="text-primary min-w-0 text-left">
                    {formatPlaybackTime(displayPosition)}
                  </span>
                  <span className="text-edge shrink-0 justify-self-center" aria-hidden>
                    /
                  </span>
                  <span className="min-w-0 text-right">{formatPlaybackTime(timelineDuration)}</span>
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
                    <span className="sr-only" role="status" aria-live="polite">
                      {t("playerSeekBuffering")}
                    </span>
                  ) : null}
                  <div className="decoder-audio-custom-track absolute inset-x-0" aria-hidden />
                  {chapterTimelineMarkers.length > 0 ? (
                    <div className="decoder-audio-chapter-ticks absolute inset-0" aria-hidden>
                      {chapterTimelineMarkers.map((m) => {
                        const isPast = m.pct < progressPct - 0.02;
                        const isCurrent =
                          activeChapterStartT != null &&
                          Math.abs(m.t - activeChapterStartT) < 0.03;
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
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={progressPct}
                    disabled={ctx.loadError || timelineDuration <= 0}
                    onPointerDown={() => {
                      scrubValueRef.current = progressPct;
                    }}
                    onChange={(e) => onProgressChange(Number(e.target.value))}
                    onPointerUp={onProgressCommit}
                    onPointerCancel={onProgressCommit}
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

                  <button
                    type="button"
                    onClick={onMainPlayPause}
                    disabled={ctx.loadError}
                    className="group border-primary/15 bg-accent focus-visible:outline-accent relative flex size-[3.75rem] shrink-0 items-center justify-center rounded-sm border-2 text-[#0b0f14] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-200 hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                    aria-label={
                      mainTransportShowsPause
                        ? t("playerPause")
                        : isPageEpisodeActive
                          ? t("playerPlay")
                          : t("playerPlayThisEpisode")
                    }
                  >
                    {mainTransportShowsPause ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                        className="translate-x-px"
                      >
                        <path d="M8 5v14l11-7L8 5z" />
                      </svg>
                    )}
                    <span
                      className="pointer-events-none absolute inset-0 rounded-sm bg-[radial-gradient(circle_at_30%_30%,rgb(255_255_255/0.45),transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </button>

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

                <button
                  type="button"
                  onClick={onMainPlayPause}
                  disabled={ctx.loadError}
                  className="group border-primary/15 bg-accent focus-visible:outline-accent relative hidden size-14 shrink-0 items-center justify-center rounded-sm border-2 text-[#0b0f14] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-200 hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 sm:flex"
                  aria-label={
                    mainTransportShowsPause
                      ? t("playerPause")
                      : isPageEpisodeActive
                        ? t("playerPlay")
                        : t("playerPlayThisEpisode")
                  }
                >
                  {mainTransportShowsPause ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                      className="translate-x-px"
                    >
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                  )}
                  <span
                    className="pointer-events-none absolute inset-0 rounded-sm bg-[radial-gradient(circle_at_30%_30%,rgb(255_255_255/0.45),transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </button>
              </div>
            </div>

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
                <span className="font-mono text-[10px] tracking-widest tabular-nums">
                  {rateLabel}
                </span>
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
                  style={
                    { "--decoder-vol": `${(ctx.muted ? 0 : ctx.volume) * 100}%` } as CSSProperties
                  }
                  aria-label={t("playerVolume")}
                />
              </div>
            ) : null}

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
          </div>
        </div>
      </section>
    );
  },
);

EpisodeAudioPlayer.displayName = "EpisodeAudioPlayer";
