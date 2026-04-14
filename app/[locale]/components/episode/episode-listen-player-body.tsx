"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { Episode, EpisodeChapter } from "@/lib/episode-catalog";
import { EpisodeDescriptionRich } from "@/lib/episode-description";
import { formatChapterHash, getChapterFragmentKey } from "@/lib/episode-hash";

import { EpisodeListenPlatformLinks } from "../sections/podcast-platform-links";

import { EpisodeAudioPlayer, type EpisodeAudioPlayerHandle } from "./episode-audio-player";
import { EpisodeChapterList } from "./episode-chapter-list";
import { EpisodeTranscriptPanel } from "./episode-transcript-panel";

type TabId = "about" | "chapters" | "transcript";
const BG_SETTLE_TRANSITION = "transform 1.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 1s ease 0.08s";
const BG_SETTLE_CLEANUP_MS = 1500;

interface EpisodeListenPlayerAndBodyProps {
  episode: Episode;
  accentIsLeft: boolean;
  afterPlayerSlot?: ReactNode;
  transcriptUrl?: string;
}

export function EpisodeListenPlayerAndBody({
  episode,
  accentIsLeft,
  afterPlayerSlot,
  transcriptUrl,
}: EpisodeListenPlayerAndBodyProps) {
  const t = useTranslations("listen");
  const tContact = useTranslations("contact");

  const playerRef = useRef<EpisodeAudioPlayerHandle>(null);
  const [playbackCurrent, setPlaybackCurrent] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const settleRafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chapters = episode.chapters ?? [];
  const hasChapters = chapters.length > 0;
  const hasTranscript = Boolean(transcriptUrl);

  const tabs: { id: TabId; label: string }[] = [
    { id: "about", label: t("tabAbout") },
    ...(hasChapters ? [{ id: "chapters" as TabId, label: t("tabChapters") }] : []),
    ...(hasTranscript ? [{ id: "transcript" as TabId, label: t("tabTranscript") }] : []),
  ];

  const [activeTab, setActiveTab] = useState<TabId>("about");
  // Once the transcript tab is activated keep it mounted so load state is preserved
  const [transcriptMounted, setTranscriptMounted] = useState(false);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    if (tab === "transcript") setTranscriptMounted(true);
  }

  const onTick = useCallback((currentTime: number, dur: number) => {
    setPlaybackCurrent(currentTime);
    setPlaybackDuration(dur);
  }, []);

  const clearBgSettleStyles = useCallback((bar: HTMLElement) => {
    bar.style.animation = "";
    bar.style.transform = "";
    bar.style.transition = "";
    bar.style.opacity = "";
  }, []);

  const cancelBgSettle = useCallback(() => {
    if (settleRafRef.current !== null) {
      cancelAnimationFrame(settleRafRef.current);
      settleRafRef.current = null;
    }
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const onPlayingChange = useCallback(
    (playing: boolean) => {
      cancelBgSettle();

      if (playing) {
        // Clear only settle-related properties — leave React-managed ones (height, vars) intact
        document
          .querySelectorAll<HTMLElement>(".waveform-bar--listen-bg")
          .forEach(clearBgSettleStyles);
        document.documentElement.dataset.episodePlaying = "true";
      } else {
        // Capture each bar's live animated height via computed style and freeze it inline.
        // Use individual properties, not cssText, so React-managed styles are preserved.
        const bars = Array.from(document.querySelectorAll<HTMLElement>(".waveform-bar--listen-bg"));
        bars.forEach((bar) => {
          const liveTransform = getComputedStyle(bar).transform;
          bar.style.animation = "none";
          bar.style.transform = liveTransform;
          bar.style.transition = "none";
          bar.style.opacity = "1";
        });

        // Keep explicit "false" state for predictable CSS selectors
        document.documentElement.dataset.episodePlaying = "false";

        // Double-rAF: commit the frozen state in one frame, then in the next set target
        // values so the CSS transition fires from the frozen position downward.
        settleRafRef.current = requestAnimationFrame(() => {
          settleRafRef.current = requestAnimationFrame(() => {
            settleRafRef.current = null;
            bars.forEach((bar) => {
              bar.style.transition = BG_SETTLE_TRANSITION;
              bar.style.transform = "scaleY(0.12)";
              bar.style.opacity = "0.32";
            });
            // After transition completes, clear inline styles so CSS owns the bars again
            settleTimerRef.current = setTimeout(() => {
              bars.forEach(clearBgSettleStyles);
              settleTimerRef.current = null;
            }, BG_SETTLE_CLEANUP_MS);
          });
        });
      }
    },
    [cancelBgSettle, clearBgSettleStyles],
  );

  useEffect(() => {
    return () => {
      cancelBgSettle();
      document
        .querySelectorAll<HTMLElement>(".waveform-bar--listen-bg")
        .forEach(clearBgSettleStyles);
      document.documentElement.dataset.episodePlaying = "false";
    };
  }, [cancelBgSettle, clearBgSettleStyles]);

  const audioReady = playbackDuration > 0;
  const sortedChapters = useMemo(
    () => [...(episode.chapters ?? [])].sort((a, b) => a.t - b.t),
    [episode.chapters],
  );

  const onChapterSeek = useCallback(
    (seconds: number, chapter: EpisodeChapter) => {
      playerRef.current?.seekToSeconds(seconds);
      if (sortedChapters.length > 0) {
        const key = getChapterFragmentKey(chapter, sortedChapters);
        const url = new URL(window.location.href);
        url.hash = formatChapterHash(key);
        window.history.replaceState(null, "", url.toString());
      }
    },
    [sortedChapters],
  );

  return (
    <>
      <EpisodeAudioPlayer
        ref={playerRef}
        src={episode.links.mp3}
        episodeId={episode.id}
        title={episode.title}
        chapters={chapters.length > 0 ? chapters : undefined}
        onPlaybackTick={onTick}
        onPlayingChange={onPlayingChange}
      />

      {afterPlayerSlot}

      <div
        className={`border-edge bg-surface/80 dark:bg-surface/50 relative overflow-hidden rounded-sm border backdrop-blur-sm transition-colors duration-300 ${
          accentIsLeft ? "border-l-accent border-l-[3px]" : "border-t-accent border-t-[3px]"
        }`}
        style={{ animation: "fadeUp 0.65s ease both 0.22s" }}
      >
        <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 bg-[radial-gradient(circle_at_top_right,var(--secondary),transparent_65%)] opacity-[0.07]" />

        <div className="border-edge/60 relative flex border-b px-5 sm:px-7 md:px-8" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`mr-7 -mb-px inline-flex items-center gap-2 border-b-2 py-4 font-mono text-[11px] tracking-[0.22em] uppercase transition-all duration-200 last:mr-0 ${
                activeTab === tab.id
                  ? "border-accent-text text-primary"
                  : "text-muted/55 hover:text-muted border-transparent"
              }`}
            >
              {tab.label}
              {tab.id === "chapters" && hasChapters && (
                <span
                  className={`font-mono text-[9px] leading-none tabular-nums transition-colors duration-200 ${
                    activeTab === "chapters" ? "text-muted/70" : "text-muted/30"
                  }`}
                >
                  {chapters.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          className={activeTab !== "about" ? "hidden" : ""}
          aria-hidden={activeTab !== "about"}
        >
          <div className="space-y-6 p-5 sm:space-y-8 sm:p-6 md:p-8">
            <p className="text-muted max-w-3xl text-[15px] leading-[1.85] sm:text-base md:text-lg">
              <EpisodeDescriptionRich text={episode.description} />
            </p>

            <div className="space-y-3">
              <p className="text-muted/45 dark:text-muted/40 font-mono text-[9px] tracking-[0.24em] uppercase sm:text-[10px] sm:tracking-[0.26em]">
                {t("listenWherever")}
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <EpisodeListenPlatformLinks
                  links={episode.links}
                  getLabel={(key) => tContact(key)}
                  tone="quiet"
                />
              </div>
            </div>
          </div>
        </div>

        {hasChapters && (
          <div
            role="tabpanel"
            className={activeTab !== "chapters" ? "hidden" : ""}
            aria-hidden={activeTab !== "chapters"}
          >
            <div className="p-5 sm:p-6 md:p-8">
              <EpisodeChapterList
                chapters={chapters}
                currentTime={playbackCurrent}
                audioReady={audioReady}
                onSeek={onChapterSeek}
              />
            </div>
          </div>
        )}

        {hasTranscript && (
          <div
            role="tabpanel"
            className={activeTab !== "transcript" ? "hidden" : ""}
            aria-hidden={activeTab !== "transcript"}
          >
            {transcriptMounted && (
              <EpisodeTranscriptPanel
                transcriptUrl={transcriptUrl}
                seekToSeconds={(s) => playerRef.current?.seekToSeconds(s)}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
