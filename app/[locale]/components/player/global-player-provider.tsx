"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Episode } from "@/lib/episode-catalog";
import {
  clearEpisodeProgress,
  episodeHasStoredProgress,
  getSavedPosition,
  writeProgressSnapshot,
} from "@/lib/episode-progress-storage";
import { formatPlaybackTime } from "@/lib/format-playback-time";
import { isIosLikeWebKitNoProgrammaticVolume } from "@/lib/ios-webkit";
import { readPlayerPreferences, writePlayerPreferences } from "@/lib/player-preferences-storage";

import { MiniPlayerBar } from "./mini-player-bar";
import { PlayerContext } from "./player-context";

const PERSIST_THROTTLE_MS = 2000;
const PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2] as const;
const KEYBOARD_SKIP_SEC = 15;

function playbackRateToIndex(rate: number): number {
  const idx = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);
  if (idx >= 0) return idx;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PLAYBACK_RATES.length; i++) {
    const d = Math.abs(PLAYBACK_RATES[i] - rate);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const { type } = el as HTMLInputElement;
  return type !== "button" && type !== "submit" && type !== "checkbox" && type !== "radio";
}

function shortcutConsumingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(
    el.closest("button, a[href], [role='slider'], input, textarea, select, [contenteditable='true']"),
  );
}

interface AudioPrefs {
  volume: number;
  muted: boolean;
  rateIdx: number;
  hydrated: boolean;
}

export function GlobalPlayerProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("listen");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPersistAtRef = useRef(0);

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [resumeHintVisible, setResumeHintVisible] = useState(false);
  const [hasClearableProgress, setHasClearableProgress] = useState(false);
  const [programmaticVolume, setProgrammaticVolume] = useState(true);
  const [prefs, setPrefs] = useState<AudioPrefs>({
    volume: 1,
    muted: false,
    rateIdx: 0,
    hydrated: false,
  });

  const playbackRate = PLAYBACK_RATES[prefs.rateIdx];

  useEffect(() => {
    queueMicrotask(() => {
      const p = readPlayerPreferences();
      setPrefs({
        volume: p.volume,
        muted: p.muted,
        rateIdx: playbackRateToIndex(p.playbackRate),
        hydrated: true,
      });
      if (isIosLikeWebKitNoProgrammaticVolume()) {
        setProgrammaticVolume(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!prefs.hydrated) return;
    writePlayerPreferences({
      volume: prefs.volume,
      muted: prefs.muted,
      playbackRate: PLAYBACK_RATES[prefs.rateIdx],
    });
  }, [prefs]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = programmaticVolume ? prefs.volume : 1;
    el.muted = prefs.muted;
  }, [prefs.volume, prefs.muted, programmaticVolume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const getEpisodeId = () => el.dataset.episodeId ?? "";

    const persistNow = () => {
      if (!Number.isFinite(el.duration) || el.duration <= 0) return;
      const id = getEpisodeId();
      if (!id) return;
      writeProgressSnapshot(id, el.currentTime, el.duration);
      setHasClearableProgress(episodeHasStoredProgress(id));
    };

    const onPlay = () => {
      setIsPlaying(true);
      setResumeNotice(null);
      setResumeHintVisible(false);
    };

    const onPause = () => {
      setIsPlaying(false);
      persistNow();
    };

    const onEnded = () => {
      setIsPlaying(false);
      setHasClearableProgress(false);
      const id = getEpisodeId();
      if (id) clearEpisodeProgress(id);
    };

    const onTime = () => {
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      setCurrentTime(el.currentTime);
      setDuration(d);
      if (el.paused) return;
      const now = Date.now();
      if (now - lastPersistAtRef.current < PERSIST_THROTTLE_MS) return;
      lastPersistAtRef.current = now;
      persistNow();
    };

    const onSeeked = () => {
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      setCurrentTime(el.currentTime);
      setDuration(d);
      lastPersistAtRef.current = Date.now();
      persistNow();
    };

    const onMeta = () => {
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      setDuration(d);
      if (d <= 0) return;
      const id = getEpisodeId();
      if (!id) return;
      const saved = getSavedPosition(id, d);
      if (saved !== null) {
        el.currentTime = saved;
        setCurrentTime(saved);
        setResumeNotice(t("playerResumingFrom", { time: formatPlaybackTime(saved) }));
      } else {
        setResumeNotice(null);
      }
      const has = episodeHasStoredProgress(id);
      setHasClearableProgress(has);
      setResumeHintVisible(has);
    };

    const readBuffered = () => {
      if (!Number.isFinite(el.duration) || el.duration <= 0) return;
      let maxEnd = 0;
      for (let i = 0; i < el.buffered.length; i++) {
        maxEnd = Math.max(maxEnd, el.buffered.end(i));
      }
      setBufferedPct(Math.min(100, (maxEnd / el.duration) * 100));
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("progress", readBuffered);
    el.addEventListener("error", () => setLoadError(true));

    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onMeta();
      readBuffered();
    }

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("progress", readBuffered);
    };
  }, [t]);

  useEffect(() => {
    const flush = () => {
      const el = audioRef.current;
      if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
      const id = el.dataset.episodeId ?? "";
      if (!id) return;
      writeProgressSnapshot(id, el.currentTime, el.duration);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const loadErrorRef = useRef(loadError);
  const episodeRef = useRef(episode);
  useEffect(() => { loadErrorRef.current = loadError; }, [loadError]);
  useEffect(() => { episodeRef.current = episode; }, [episode]);

  const seek = useCallback((seconds: number, notice?: string) => {
    const el = audioRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    const clamped = d > 0 ? Math.max(0, Math.min(d, seconds)) : Math.max(0, seconds);
    el.currentTime = clamped;
    setCurrentTime(clamped);
    setResumeNotice(notice ?? null);
    setResumeHintVisible(false);
  }, []);

   const resetPlaybackState = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoadError(false);
    setBufferedPct(0);
    setResumeNotice(null);
    setResumeHintVisible(false);
    setHasClearableProgress(false);
  }, []);

  const loadEpisode = useCallback((ep: Episode) => {
    const el = audioRef.current;
    if (!el) return;
    if (el.dataset.episodeId === ep.id && el.src) return;
    if (!el.paused) el.pause();
    setEpisode(ep);
    resetPlaybackState();
    el.dataset.episodeId = ep.id;
    el.src = ep.links.mp3;
    el.load();
  }, [resetPlaybackState]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || loadErrorRef.current) return;
    if (el.paused) {
      el.play().catch(() => setLoadError(true));
    } else {
      el.pause();
    }
  }, []);

  const skip = useCallback(
    (deltaSecs: number) => {
      const el = audioRef.current;
      if (!el) return;
      seek(el.currentTime + deltaSecs);
    },
    [seek],
  );

  const dismiss = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
      el.dataset.episodeId = "";
    }
    setEpisode(null);
    resetPlaybackState();
  }, [resetPlaybackState]);

  const setVolume = useCallback((v: number) => {
    setPrefs((prev) => ({ ...prev, volume: v, muted: v === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    setPrefs((prev) => {
      if (prev.muted) return { ...prev, muted: false };
      if (prev.volume > 0) return { ...prev, muted: true };
      return { ...prev, volume: 0.85, muted: false };
    });
  }, []);

  const cycleRate = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      rateIdx: (prev.rateIdx + 1) % PLAYBACK_RATES.length,
    }));
  }, []);

  const clearProgress = useCallback(() => {
    const id = episodeRef.current?.id;
    if (!id) return;
    clearEpisodeProgress(id);
    seek(0);
    setHasClearableProgress(false);
  }, [seek]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (isTypingTarget(e.target)) return;
      if (!episodeRef.current) return;

      if (e.code === "Space" || e.key === " " || e.key === "k" || e.key === "K") {
        if (shortcutConsumingTarget(e.target)) return;
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        skip(e.code === "ArrowLeft" ? -KEYBOARD_SKIP_SEC : KEYBOARD_SKIP_SEC);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, skip]);

  const contextValue = useMemo(
    () => ({
      episode,
      isPlaying,
      currentTime,
      duration,
      loadError,
      bufferedPct,
      resumeNotice,
      resumeHintVisible,
      volume: prefs.volume,
      muted: prefs.muted,
      playbackRate,
      hasClearableProgress,
      programmaticVolume,
      loadEpisode,
      togglePlay,
      seek,
      skip,
      dismiss,
      setVolume,
      toggleMute,
      cycleRate,
      clearProgress,
      audioRef,
    }),
    [
      episode,
      isPlaying,
      currentTime,
      duration,
      loadError,
      bufferedPct,
      resumeNotice,
      resumeHintVisible,
      prefs.volume,
      prefs.muted,
      playbackRate,
      hasClearableProgress,
      programmaticVolume,
      loadEpisode,
      togglePlay,
      seek,
      skip,
      dismiss,
      setVolume,
      toggleMute,
      cycleRate,
      clearProgress,
    ],
  );

  return (
    <PlayerContext.Provider value={contextValue}>
      <audio ref={audioRef} preload="metadata" className="sr-only" aria-hidden>
        <track kind="captions" />
      </audio>
      {children}
      <MiniPlayerBar />
    </PlayerContext.Provider>
  );
}
