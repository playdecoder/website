"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { episodeListenPathSegment } from "@/lib/episode-catalog";
import { formatPlaybackTime } from "@/lib/format-playback-time";
import { listenEpisodePath } from "@/lib/routes";
import { usePathname } from "@/i18n/navigation";

import { usePlayerContext } from "./player-context";
import { useWaveformSettle } from "./use-waveform-settle";
import { VolumeIcon } from "./volume-icon";

const MINI_WAVEFORM_BARS = [
  { id: "m0", h: 40, dur: 0.72, delay: 0.0 },
  { id: "m1", h: 70, dur: 0.65, delay: 0.11 },
  { id: "m2", h: 100, dur: 0.81, delay: 0.06 },
  { id: "m3", h: 85, dur: 0.6, delay: 0.18 },
  { id: "m4", h: 55, dur: 0.89, delay: 0.04 },
] as const;

const SKIP_SEC = 15;

export function MiniPlayerBar() {
  const ctx = usePlayerContext();
  const t = useTranslations("miniPlayer");
  const locale = useLocale();
  const pathname = usePathname();

  const waveformRef = useRef<HTMLDivElement>(null);

  const [rendered, setRendered] = useState(false);
  const [show, setShow] = useState(false);
  const enterRafRef = useRef<number | null>(null);

  const { episode, isPlaying, currentTime, duration, loadError, programmaticVolume } = ctx;

  const onListenPage =
    episode !== null &&
    pathname.startsWith("/listen/") &&
    pathname.includes(episodeListenPathSegment(episode));

  const visible = episode !== null && !onListenPage;

  useEffect(() => {
    let cancelled = false;
    if (visible) {
      queueMicrotask(() => {
        if (!cancelled) setRendered(true);
      });
      enterRafRef.current = requestAnimationFrame(() => {
        enterRafRef.current = requestAnimationFrame(() => {
          if (!cancelled) setShow(true);
          enterRafRef.current = null;
        });
      });
    } else {
      if (enterRafRef.current !== null) {
        cancelAnimationFrame(enterRafRef.current);
        enterRafRef.current = null;
      }
      queueMicrotask(() => {
        if (!cancelled) setShow(false);
      });
    }
    return () => {
      cancelled = true;
      if (enterRafRef.current !== null) {
        cancelAnimationFrame(enterRafRef.current);
        enterRafRef.current = null;
      }
    };
  }, [visible]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === "transform" && !visible) {
      setRendered(false);
    }
  };

  useWaveformSettle(
    isPlaying,
    () => Array.from(waveformRef.current?.querySelectorAll<HTMLElement>(".mini-wf-bar") ?? []),
    { settleScale: "scaleY(0.15)", settleOpacity: 0.3 },
  );

  if (!rendered || !episode) return null;

  const progressPct =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const listenHref = `/${locale}${listenEpisodePath(episodeListenPathSegment(episode))}`;

  return (
    <div
      role="region"
      aria-label={t("regionAria")}
      onTransitionEnd={handleTransitionEnd}
      className={`fixed right-0 bottom-0 left-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="relative h-px w-full overflow-hidden">
        <div className="bg-edge/40 absolute inset-0" />
        <div
          className="bg-accent absolute top-0 bottom-0 left-0 transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>

      <div className="border-edge/60 bg-surface/[0.92] relative border-t backdrop-blur-xl">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            background:
              "radial-gradient(ellipse 60% 120% at 50% 200%, var(--accent), transparent)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-5">
          <Link
            href={listenHref}
            className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
            aria-label={t("goToEpisodeAria", { id: episode.id, title: episode.title })}
          >
            <div
              ref={waveformRef}
              className="mini-player-waveform flex h-6 shrink-0 items-center gap-[2px]"
              data-playing={isPlaying || undefined}
              aria-hidden
            >
              {MINI_WAVEFORM_BARS.map((bar) => (
                <span
                  key={bar.id}
                  className="mini-wf-bar bg-accent/80 w-[2px] rounded-[1px]"
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

            <div className="min-w-0">
              <p className="text-primary flex items-baseline gap-1.5 leading-tight">
                <span className="text-accent-text font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
                  {episode.id}
                </span>
                <span className="font-display truncate text-sm font-semibold tracking-tight group-hover:underline">
                  {episode.title}
                </span>
              </p>
              {duration > 0 ? (
                <p className="text-muted/60 grid max-w-[11rem] grid-cols-[1fr_auto_1fr] items-center gap-x-1.5 font-mono text-[10px] tracking-widest tabular-nums sm:max-w-none sm:gap-x-2">
                  <span className="min-w-0 text-left">{formatPlaybackTime(currentTime)}</span>
                  <span className="text-edge shrink-0 justify-self-center" aria-hidden>
                    /
                  </span>
                  <span className="min-w-0 text-right">{formatPlaybackTime(duration)}</span>
                </p>
              ) : (
                <p className="text-muted/60 font-mono text-[10px] tracking-widest tabular-nums">
                  {formatPlaybackTime(currentTime)}
                </p>
              )}
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => ctx.skip(-SKIP_SEC)}
              disabled={loadError || duration <= 0}
              className="text-muted hover:text-primary hover:bg-surface-2/70 active:bg-surface-2 flex size-9 items-center justify-center rounded-sm transition-colors disabled:pointer-events-none disabled:opacity-30 sm:size-10"
              aria-label={t("skipBack")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11 18V6l-8.5 6 8.5 6zm1-6l8.5 6V6l-8.5 6z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={ctx.togglePlay}
              disabled={loadError}
              className="group border-primary/10 bg-accent focus-visible:outline-accent relative flex size-9 shrink-0 items-center justify-center rounded-sm border text-[#0b0f14] shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] transition-transform duration-200 hover:scale-[1.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.95] disabled:pointer-events-none disabled:opacity-40 sm:size-10"
              aria-label={isPlaying ? t("pause") : t("play")}
            >
              <span
                className="decoder-play-ring"
                style={{ "--ring-color": "rgb(11 15 20 / 0.18)" } as CSSProperties}
                aria-hidden
              />
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                  className="translate-x-px"
                >
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => ctx.skip(SKIP_SEC)}
              disabled={loadError || duration <= 0}
              className="text-muted hover:text-primary hover:bg-surface-2/70 active:bg-surface-2 flex size-9 items-center justify-center rounded-sm transition-colors disabled:pointer-events-none disabled:opacity-30 sm:size-10"
              aria-label={t("skipForward")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
              </svg>
            </button>

            {programmaticVolume && (
              <div className="hidden items-center gap-1.5 md:flex">
                <span className="bg-edge/60 mx-0.5 h-6 w-px" aria-hidden />
                <button
                  type="button"
                  onClick={ctx.toggleMute}
                  disabled={loadError}
                  className="text-muted hover:text-primary hover:bg-surface-2/70 active:bg-surface-2 flex size-9 items-center justify-center rounded-sm transition-colors disabled:pointer-events-none disabled:opacity-30 sm:size-10"
                  aria-label={ctx.muted || ctx.volume === 0 ? t("unmute") : t("mute")}
                >
                  <VolumeIcon muted={ctx.muted} volume={ctx.muted ? 0 : ctx.volume} size={16} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={ctx.muted ? 0 : ctx.volume}
                  disabled={loadError}
                  onChange={(e) => ctx.setVolume(Number(e.target.value))}
                  className="decoder-audio-volume w-20 disabled:opacity-30 lg:w-24"
                  style={{ "--decoder-vol": `${(ctx.muted ? 0 : ctx.volume) * 100}%` } as CSSProperties}
                  aria-label={t("volume")}
                />
              </div>
            )}

            <span className="bg-edge/60 mx-0.5 h-6 w-px" aria-hidden />

            <button
              type="button"
              onClick={ctx.dismiss}
              className="text-muted/60 hover:text-primary hover:bg-surface-2/70 active:bg-surface-2 flex size-9 items-center justify-center rounded-sm transition-colors sm:size-10"
              aria-label={t("dismiss")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
