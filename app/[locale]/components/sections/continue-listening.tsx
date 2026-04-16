"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { episodeDescriptionSnippet } from "@/lib/episode-description";
import { episodes, episodeListenPathSegment } from "@/lib/episode-catalog";
import { formatPlaybackTime } from "@/lib/format-playback-time";
import {
  clearEpisodeProgress,
  readProgressStore,
  subscribeEpisodeProgressStore,
  type EpisodeProgressEntry,
} from "@/lib/episode-progress-storage";
import { linkLocale } from "@/lib/link-locale";
import { formatEpisodeTimeHash } from "@/lib/episode-time-fragment";
import {
  LISTEN_AUTOPLAY_QUERY_KEY,
  LISTEN_AUTOPLAY_SERIALIZED,
} from "@/lib/listen-autoplay-query";
import { listenEpisodePath } from "@/lib/routes";

import { PlayGlyphIcon } from "../player/play-glyph-icon";
import { usePlayerContext } from "../player/player-context";

import { SignalLabelRail } from "./signal-label-rail";

const CONTINUE_MICRO_WAVE = [22, 48, 72, 38, 88, 55, 100, 42, 78, 30, 65, 52, 92, 35, 58, 44, 82, 28, 68, 50] as const;

const DESCRIPTION_SNIPPET_MAX = 240;

function pickLatestProgress(): EpisodeProgressEntry | null {
  const items = readProgressStore()
    .filter((entry) => episodes.some((episode) => episode.id === entry.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return items[0] ?? null;
}

function continueListeningSnapshot(): string | null {
  const entry = pickLatestProgress();
  return entry ? JSON.stringify(entry) : null;
}

export function ContinueListening({ locale }: { locale: string }) {
  const t = useTranslations("continueListening");
  const pathname = usePathname();
  const { episode: playerEpisode } = usePlayerContext();
  const hrefLocale = linkLocale(locale);
  const entryKey = useSyncExternalStore(
    subscribeEpisodeProgressStore,
    continueListeningSnapshot,
    () => null,
  );
  const entry = entryKey ? (JSON.parse(entryKey) as EpisodeProgressEntry) : null;

  const episode = useMemo(
    () => (entry ? episodes.find((candidate) => candidate.id === entry.id) ?? null : null),
    [entry],
  );

  const descriptionSnippet = useMemo(() => {
    if (!episode) {
      return "";
    }
    return episodeDescriptionSnippet(episode.description, DESCRIPTION_SNIPPET_MAX);
  }, [episode]);

  if (!entry || !episode) {
    return null;
  }

  const progressEpisodeId = entry.id;

  const onListenPage =
    playerEpisode !== null &&
    pathname.startsWith("/listen/") &&
    pathname.includes(episodeListenPathSegment(playerEpisode));
  const miniPlayerVisible = playerEpisode !== null && !onListenPage;
  if (miniPlayerVisible && playerEpisode.id === progressEpisodeId) {
    return null;
  }

  const timelineDuration =
    entry.duration > 0 ? entry.duration : Math.max(0, episode.duration);
  const progressPct =
    timelineDuration > 0
      ? Math.max(0, Math.min(100, (entry.currentTime / timelineDuration) * 100))
      : 0;
  const remainingSec = Math.max(0, Math.floor(timelineDuration - entry.currentTime));
  const listenPath = listenEpisodePath(episodeListenPathSegment(episode));
  const href = `${listenPath}?${LISTEN_AUTOPLAY_QUERY_KEY}=${LISTEN_AUTOPLAY_SERIALIZED}#${formatEpisodeTimeHash(entry.currentTime)}`;

  function handleClearProgress() {
    clearEpisodeProgress(progressEpisodeId);
  }

  return (
    <section className="border-edge relative border-t" aria-labelledby="continue-listening-heading">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent, var(--secondary), transparent)",
          opacity: 0.28,
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="dot-grid absolute inset-0 opacity-[0.18] dark:opacity-[0.14] lg:opacity-[0.35] lg:dark:opacity-[0.22]"
          style={{
            maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, color-mix(in srgb, var(--secondary) 9%, transparent) 0%, transparent 42%, color-mix(in srgb, var(--accent) 6%, transparent) 100%)",
          }}
        />
      </div>

      <span className="border-edge pointer-events-none absolute top-4 left-4 hidden h-3.5 w-3.5 border-t border-l opacity-70 sm:block md:top-5 md:left-6 lg:opacity-100" />
      <span className="border-edge pointer-events-none absolute top-4 right-4 hidden h-3.5 w-3.5 border-t border-r opacity-70 sm:block md:top-5 md:right-6 lg:opacity-100" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-9 md:py-12">
        <div className="scroll-reveal flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-10">
          <div className="w-full shrink-0 lg:w-[min(100%,12.5rem)]">
            <div className="border-edge/55 flex items-center justify-between gap-3 border-b pb-2.5 lg:hidden">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="bg-accent h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ animation: "pulseDot 2.4s ease-in-out infinite" }}
                  aria-hidden
                />
                <span className="text-muted truncate font-mono text-[10px] tracking-[0.22em] uppercase">
                  {t("label")}
                </span>
              </div>
              <span className="text-accent-text shrink-0 rounded-sm border border-edge/60 bg-surface/40 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest tabular-nums">
                {episode.id}
              </span>
            </div>

            <div className="mt-3 hidden flex-col gap-3.5 lg:mt-0 lg:flex">
              <SignalLabelRail label={t("label")} dotClassName="bg-accent" />

              <div
                className="flex h-8 max-w-[10.5rem] items-end justify-start gap-[3px] opacity-80"
                aria-hidden
              >
                {CONTINUE_MICRO_WAVE.map((pct, i) => (
                  <span
                    key={i}
                    className="w-[3px] max-w-[3px] shrink-0 rounded-t-[2px]"
                    style={{
                      height: `${pct}%`,
                      background:
                        i % 4 === 0
                          ? "var(--waveform-accent)"
                          : i % 3 === 0
                            ? "var(--waveform-secondary)"
                            : "var(--waveform-primary)",
                      opacity: 0.35 + (i % 6) * 0.08,
                    }}
                  />
                ))}
              </div>

              <span className="text-accent-text font-mono text-xs font-medium tracking-widest sm:text-[13px]">
                {episode.id}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 lg:pt-0">
            <h2
              id="continue-listening-heading"
              className="font-display text-primary mb-3 leading-[1.08] font-bold"
              style={{ fontSize: "clamp(1.25rem, 2.85vw, 1.95rem)" }}
            >
              <span className="sr-only">{t("label")}: </span>
              {episode.title}
            </h2>
            <p className="text-muted mb-4 max-w-2xl text-[15px] leading-relaxed sm:text-base">
              {descriptionSnippet || t("body")}
            </p>

            <div className="text-muted mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] tracking-widest sm:text-xs">
              <span>{t("resumeFrom", { time: formatPlaybackTime(entry.currentTime) })}</span>
              <span aria-hidden className="text-edge">
                ·
              </span>
              <span>{t("timeLeft", { time: formatPlaybackTime(remainingSec) })}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link
                href={href}
                locale={hrefLocale}
                prefetch
                className="premium-cta cta-on-lime inline-flex items-center justify-center gap-2 rounded-sm px-5 py-2.5 font-mono text-[11px] font-medium tracking-widest uppercase transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] sm:text-xs"
              >
                <PlayGlyphIcon size={14} />
                {t("cta")}
              </Link>
              <button
                type="button"
                onClick={handleClearProgress}
                className="text-muted/45 hover:text-muted/85 focus-visible:text-primary rounded-sm px-1.5 py-1.5 font-mono text-[9px] tracking-[0.14em] uppercase underline-offset-[5px] transition-colors hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                {t("deleteProgress")}
              </button>
            </div>
          </div>
        </div>

        <div
          className="scroll-reveal mt-8 md:mt-9"
          style={{ animationDelay: "0.08s" }}
        >
          <div
            className="h-1 w-full overflow-hidden rounded-full sm:h-1.5"
            style={{
              background: `linear-gradient(
                to right,
                color-mix(in srgb, var(--primary) 8%, color-mix(in srgb, var(--surface-2) 78%, var(--edge))) 0%,
                color-mix(in srgb, var(--primary) 8%, color-mix(in srgb, var(--surface-2) 78%, var(--edge))) 100%
              )`,
            }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(
                  to right,
                  var(--secondary) 0%,
                  color-mix(in srgb, var(--accent) 82%, var(--secondary)) 100%
                )`,
                boxShadow: "0 0 14px color-mix(in srgb, var(--accent) 28%, transparent)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
