"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Episode } from "@/lib/episode-catalog";
import { clearEpisodeProgress, writeProgressSnapshot } from "@/lib/episode-progress-storage";
import { isIosLikeWebKitNoProgrammaticVolume } from "@/lib/ios-webkit";
import { readPlayerPreferences, writePlayerPreferences } from "@/lib/player-preferences-storage";

import {
  debugPlayerDiag,
  inferSeekNeedsBuffer,
  initialMediaState,
  mediaReducer,
  subscribeGlobalPlayerAudio,
} from "./global-player-media";
import { MiniPlayerBar } from "./mini-player-bar";
import { PlayerContext } from "./player-context";
const PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2] as const;
const KEYBOARD_SKIP_SEC = 15;

function playbackRateToIndex(rate: number): number {
  const exact = PLAYBACK_RATES.findIndex((r) => r === rate);
  if (exact >= 0) return exact;
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
    el.closest(
      "button, a[href], [role='slider'], input, textarea, select, [contenteditable='true']",
    ),
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
  const [media, dispatchMedia] = useReducer(mediaReducer, null, () => initialMediaState());
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
    return subscribeGlobalPlayerAudio(el, dispatchMedia, lastPersistAtRef, t);
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

  const loadErrorRef = useRef(media.loadError);
  const episodeRef = useRef(episode);
  useEffect(() => {
    loadErrorRef.current = media.loadError;
  }, [media.loadError]);
  useEffect(() => {
    episodeRef.current = episode;
  }, [episode]);

  const seek = useCallback((seconds: number, notice?: string) => {
    const el = audioRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    const clamped = d > 0 ? Math.max(0, Math.min(d, seconds)) : Math.max(0, seconds);
    const needsSeekBuffer = d > 0 ? inferSeekNeedsBuffer(el, clamped) : false;
    el.currentTime = clamped;
    dispatchMedia({
      type: "patch",
      patch: {
        currentTime: clamped,
        resumeNotice: notice ?? null,
        resumeHintVisible: false,
        ...(d > 0 ? { isSeekBuffering: needsSeekBuffer } : {}),
      },
    });
  }, []);

  const resetPlaybackState = useCallback(() => {
    dispatchMedia({ type: "reset" });
  }, []);

  const loadEpisode = useCallback(
    (ep: Episode) => {
      const el = audioRef.current;
      if (!el) return;
      if (el.dataset.episodeId === ep.id && el.src) return;
      if (!el.paused) el.pause();
      debugPlayerDiag("loadEpisode", { episodeId: ep.id, src: ep.links.mp3 });
      setEpisode(ep);
      resetPlaybackState();
      dispatchMedia({ type: "patch", patch: { isInitialLoading: true, isSeekBuffering: false } });
      el.dataset.episodeId = ep.id;
      el.src = ep.links.mp3;
      el.load();
    },
    [resetPlaybackState],
  );

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || loadErrorRef.current) return;
    if (el.paused) {
      el.play().catch(() =>
        dispatchMedia({ type: "patch", patch: { loadError: true, isSeekBuffering: false } }),
      );
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
    dispatchMedia({ type: "patch", patch: { hasClearableProgress: false } });
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
        return;
      }
      if ((e.key === "," || e.key === ".") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        cycleRate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, skip, cycleRate]);

  const contextValue = useMemo(
    () => ({
      episode,
      isPlaying: media.isPlaying,
      currentTime: media.currentTime,
      duration: media.duration,
      loadError: media.loadError,
      bufferedPct: media.bufferedPct,
      isInitialLoading: media.isInitialLoading,
      isSeekBuffering: media.isSeekBuffering,
      resumeNotice: media.resumeNotice,
      resumeHintVisible: media.resumeHintVisible,
      volume: prefs.volume,
      muted: prefs.muted,
      playbackRate,
      hasClearableProgress: media.hasClearableProgress,
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
      media.isPlaying,
      media.currentTime,
      media.duration,
      media.loadError,
      media.bufferedPct,
      media.isInitialLoading,
      media.isSeekBuffering,
      media.resumeNotice,
      media.resumeHintVisible,
      prefs.volume,
      prefs.muted,
      playbackRate,
      media.hasClearableProgress,
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
