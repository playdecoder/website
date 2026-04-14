"use client";

import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { Episode, EpisodeChapter } from "@/lib/episode-catalog";
import { EpisodeDescriptionRich } from "@/lib/episode-description";
import { formatChapterHash, getChapterFragmentKey } from "@/lib/episode-hash";

import { usePlayerContext } from "../player/player-context";
import { useWaveformSettle } from "../player/use-waveform-settle";
import { EpisodeListenPlatformLinks } from "../sections/podcast-platform-links";

import { EpisodeAudioPlayer } from "./episode-audio-player";
import { EpisodeChapterList } from "./episode-chapter-list";
import { EpisodeTranscriptPanel } from "./episode-transcript-panel";

type TabId = "about" | "chapters" | "transcript";

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
  const { loadEpisode, seek, isPlaying, currentTime, duration, episode: playingEpisode } =
    usePlayerContext();

  const playingRef = useRef(playingEpisode);
  playingRef.current = playingEpisode;

  const isPageEpisodeActive = playingEpisode?.id === episode.id;
  const chaptersCanSeek = isPageEpisodeActive && duration > 0;

  const chapters = useMemo(
    () => [...(episode.chapters ?? [])].sort((a, b) => a.t - b.t),
    [episode.chapters],
  );
  const hasChapters = chapters.length > 0;
  const hasTranscript = Boolean(transcriptUrl);

  const tabs: { id: TabId; label: string }[] = [
    { id: "about", label: t("tabAbout") },
    ...(hasChapters ? [{ id: "chapters" as TabId, label: t("tabChapters") }] : []),
    ...(hasTranscript ? [{ id: "transcript" as TabId, label: t("tabTranscript") }] : []),
  ];

  const [activeTab, setActiveTab] = useState<TabId>("about");
  const [transcriptMounted, setTranscriptMounted] = useState(false);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    if (tab === "transcript") setTranscriptMounted(true);
  }

  useEffect(() => {
    const loaded = playingRef.current;
    if (loaded == null) {
      loadEpisode(episode);
      return;
    }
    if (loaded.id === episode.id) {
      loadEpisode(episode);
    }
  }, [episode, loadEpisode]);

  useWaveformSettle(
    isPlaying && isPageEpisodeActive,
    () => Array.from(document.querySelectorAll<HTMLElement>(".waveform-bar--listen-bg")),
    {
      frozenOpacity: 1,
      settleScale: "scaleY(0.12)",
      settleTransition: "transform 1.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 1s ease 0.08s",
      cleanupMs: 1500,
    },
  );

  useEffect(() => {
    document.documentElement.dataset.episodePlaying =
      isPlaying && isPageEpisodeActive ? "true" : "false";
  }, [isPlaying, isPageEpisodeActive]);

  useEffect(() => {
    return () => {
      document.documentElement.dataset.episodePlaying = "false";
      for (const bar of document.querySelectorAll<HTMLElement>(".waveform-bar--listen-bg")) {
        bar.style.removeProperty("animation");
        bar.style.removeProperty("transform");
        bar.style.removeProperty("transition");
        bar.style.removeProperty("opacity");
      }
    };
  }, []);

  const onChapterSeek = useCallback(
    (seconds: number, chapter: EpisodeChapter) => {
      seek(seconds);
      if (chapters.length > 0) {
        const key = getChapterFragmentKey(chapter, chapters);
        const url = new URL(window.location.href);
        url.hash = formatChapterHash(key);
        window.history.replaceState(null, "", url.toString());
      }
    },
    [chapters, seek],
  );

  return (
    <>
      <EpisodeAudioPlayer
        key={`listen-audio-${episode.id}`}
        episode={episode}
        chapters={hasChapters ? chapters : undefined}
      />

      {afterPlayerSlot != null ? (
        <Fragment key="listen-after-player">{afterPlayerSlot}</Fragment>
      ) : null}

      <div
        key="listen-tabs"
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
                currentTime={currentTime}
                audioReady={chaptersCanSeek}
                showLoadHint={isPageEpisodeActive}
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
                key={transcriptUrl}
                transcriptUrl={transcriptUrl}
                seekToSeconds={isPageEpisodeActive ? seek : undefined}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
