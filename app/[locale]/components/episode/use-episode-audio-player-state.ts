"use client";

import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { useEffect, useRef, useState, type RefObject } from "react";

import type { Episode } from "@/lib/episode/catalog";
import { episodePublicationTitle } from "@/lib/episode/format";
import type { EpisodeHashChapter } from "@/lib/episode/hash";
import { resolveEpisodeSeekFromHash } from "@/lib/episode/hash";
import { getSavedPosition } from "@/lib/episode/progress-storage";
import { formatEpisodeTimeHash } from "@/lib/episode/time-fragment";
import { formatPlaybackTime } from "@/lib/player/format-playback-time";
import {
  LISTEN_AUTOPLAY_QUERY_KEY,
  parseAsListenAutoplay,
} from "@/lib/player/listen-autoplay-query";

import { usePlayerContext } from "../player/player-context";
import { useWaveformSettle } from "../player/use-waveform-settle";

type ChapterTimelineMarker = {
  t: number;
  pct: number;
  label: string;
  key: string;
};

export type EpisodeAudioPlayerTransportState = {
  displayPosition: number;
  timelineDuration: number;
  progressPct: number;
  chapterTimelineMarkers: ChapterTimelineMarker[];
  activeChapterStartT: number | null;
  showSeekBuffering: boolean;
  mainTransportShowsPause: boolean;
  rateLabel: string;
  volumeIconLevel: number;
  copyStatus: "idle" | "copied" | "error";
  copyEpisodeLink: () => Promise<void>;
  progressInputRef: RefObject<HTMLInputElement | null>;
  scrubPosition: number | null;
  pointerScrubbingRef: RefObject<boolean>;
  onProgressPointerDown: () => void;
  onProgressChange: (v: number) => void;
  onProgressCommit: (v?: number) => void;
  commitProgressAfterPointer: () => void;
  onMainPlayPause: () => void;
};

export function useEpisodeAudioPlayerState(episode: Episode, chapters?: EpisodeHashChapter[]) {
  const t = useTranslations("listen");
  const ctx = usePlayerContext();
  const { seek, loadEpisode, togglePlay, episode: ctxEpisode, audioRef } = ctx;
  const episodeId = episode.id;
  const title = episodePublicationTitle(episode);
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

  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  let progressResumeCaption: string | null = null;
  if (isPageEpisodeActive && ctx.resumeHintVisible && ctx.hasClearableProgress) {
    if (ctx.resumeNotice) {
      progressResumeCaption = ctx.resumeNotice;
    } else if (episodeId && ctx.duration > 0) {
      const saved = getSavedPosition(episodeId, ctx.duration);
      progressResumeCaption =
        saved !== null
          ? t("playerResumingFrom", { time: formatPlaybackTime(saved) })
          : t("playerSavedPlace");
    }
  }

  const [scrubPosition, setScrubPosition] = useState<number | null>(null);
  const scrubValueRef = useRef(0);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const pointerScrubbingRef = useRef(false);

  const displayPosition = isPageEpisodeActive ? (scrubPosition ?? ctx.currentTime) : 0;
  const timelineDuration = isPageEpisodeActive ? ctx.duration : 0;
  const progressPct =
    timelineDuration <= 0
      ? 0
      : Math.min(100, Math.max(0, (displayPosition / timelineDuration) * 100));

  const chapterTimelineMarkers: ChapterTimelineMarker[] = [];
  if (chapters?.length && timelineDuration > 0) {
    const d = timelineDuration;
    const padStart = 0.85;
    const padEnd = 0.65;
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (ch.t >= padStart && ch.t <= d - padEnd) {
        const pct = Math.min(100, Math.max(0, (ch.t / d) * 100));
        chapterTimelineMarkers.push({
          t: ch.t,
          pct,
          label: ch.label,
          key: `ch-mark-${ch.t}-${i}-${ch.label}`,
        });
      }
    }
  }

  let activeChapterStartT: number | null = null;
  if (chapters?.length && timelineDuration > 0) {
    const sorted = chapters.toSorted((a, b) => a.t - b.t);
    for (const ch of sorted) {
      if (ch.t <= displayPosition + 0.25) activeChapterStartT = ch.t;
    }
  }

  const rateLabel = ctx.playbackRate === 1 ? "1×" : `${ctx.playbackRate}×`;
  const volumeIconLevel = ctx.programmaticVolume ? ctx.volume : ctx.muted ? 0 : 1;
  const mainTransportShowsPause = isPageEpisodeActive && ctx.isPlaying;
  const showSeekBuffering =
    !ctx.loadError &&
    (!isPageEpisodeActive ||
      (isPageEpisodeActive && (ctx.isInitialLoading || ctx.isSeekBuffering)));

  function onMainPlayPause() {
    if (ctxEpisode?.id !== episode.id) {
      loadEpisode(episode);
    }
    togglePlay();
  }

  function setScrubFromPercent(v: number) {
    scrubValueRef.current = v;
    if (timelineDuration > 0) {
      setScrubPosition((v / 100) * timelineDuration);
    }
  }

  function onProgressChange(v: number) {
    setScrubFromPercent(v);
    if (!pointerScrubbingRef.current && timelineDuration > 0) {
      seek((v / 100) * timelineDuration);
      setScrubPosition(null);
    }
  }

  function onProgressCommit(v?: number) {
    const nextValue = v ?? Number(progressInputRef.current?.value ?? scrubValueRef.current);
    if (timelineDuration > 0) {
      seek((nextValue / 100) * timelineDuration);
    }
    setScrubPosition(null);
  }

  function commitProgressAfterPointer() {
    pointerScrubbingRef.current = false;
    requestAnimationFrame(() => {
      onProgressCommit();
    });
  }

  function onProgressPointerDown() {
    pointerScrubbingRef.current = true;
    scrubValueRef.current = progressPct;
  }

  const decoderWavePlaying = useWaveformSettle(
    isPageEpisodeActive && ctx.isPlaying && !ctx.isSeekBuffering,
    () =>
      Array.from(waveformRef.current?.querySelectorAll<HTMLElement>(".decoder-waveform-bar") ?? []),
  );

  useEffect(() => {
    if (!isPageEpisodeActive || ctx.duration <= 0 || hashHandledRef.current) return;
    hashHandledRef.current = true;

    const resolved = resolveEpisodeSeekFromHash(window.location.hash, chapters ?? [], ctx.duration);
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

  const transport: EpisodeAudioPlayerTransportState = {
    displayPosition,
    timelineDuration,
    progressPct,
    chapterTimelineMarkers,
    activeChapterStartT,
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
  };

  return {
    ctx,
    episode,
    episodeId,
    title,
    isPageEpisodeActive,
    progressResumeCaption,
    waveformRef,
    decoderWavePlaying,
    transport,
  };
}
