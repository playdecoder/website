import type { Dispatch, MutableRefObject } from "react";

import {
  clearEpisodeProgress,
  episodeHasStoredProgress,
  getSavedPosition,
  writeProgressSnapshot,
} from "@/lib/episode-progress-storage";
import { formatPlaybackTime } from "@/lib/format-playback-time";

export const GLOBAL_PLAYER_PERSIST_THROTTLE_MS = 2000;

const BUFFER_EDGE_SLOP_SEC = 0.45;
/** Margin past `max(buffered.end)` when `readyState` is too low for a precise range membership check. */
const BUFFER_AHEAD_MARGIN_SEC = 0.35;

export function getBufferedMaxEndSec(el: HTMLMediaElement): number {
  const ranges = el.buffered;
  let max = 0;
  for (let i = 0; i < ranges.length; i++) {
    max = Math.max(max, ranges.end(i));
  }
  return max;
}

export function timeIsBuffered(el: HTMLAudioElement, targetSec: number): boolean {
  if (!Number.isFinite(targetSec) || targetSec < 0) return true;
  const d = el.duration;
  if (!Number.isFinite(d) || d <= 0) return true;
  const ranges = el.buffered;
  if (ranges.length === 0) {
    return el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA;
  }
  for (let i = 0; i < ranges.length; i++) {
    const start = ranges.start(i);
    const end = ranges.end(i);
    if (targetSec + BUFFER_EDGE_SLOP_SEC >= start && targetSec - BUFFER_EDGE_SLOP_SEC <= end) {
      return true;
    }
  }
  return false;
}

export function inferSeekNeedsBuffer(el: HTMLAudioElement, targetSec: number): boolean {
  const d = el.duration;
  if (!Number.isFinite(d) || d <= 0) return false;
  const t = Math.max(0, Math.min(d, targetSec));
  if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return !timeIsBuffered(el, t);
  return t > getBufferedMaxEndSec(el) + BUFFER_AHEAD_MARGIN_SEC;
}

// Memoize ?playerDebug=1 until location.search changes (avoids reparsing on high-frequency media events).
let playerDebugSearchKey = "";
let playerDebugEnabled = false;

export function isPlayerDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const key = window.location.search;
  if (key === playerDebugSearchKey) return playerDebugEnabled;
  playerDebugSearchKey = key;
  playerDebugEnabled = new URLSearchParams(key).get("playerDebug") === "1";
  return playerDebugEnabled;
}

export function debugPlayerDiag(label: string, extra: Record<string, unknown> = {}): void {
  if (!isPlayerDebugEnabled()) return;
  console.log("[decoder-player]", label, extra);
}

function bufferedRangesSummary(el: HTMLMediaElement): string {
  const parts: string[] = [];
  for (let i = 0; i < el.buffered.length; i++) {
    parts.push(`${el.buffered.start(i).toFixed(2)}-${el.buffered.end(i).toFixed(2)}`);
  }
  return parts.join(", ") || "(none)";
}

function debugPlayerEvent(
  label: string,
  el: HTMLAudioElement,
  extra: Record<string, unknown> = {},
): void {
  if (!isPlayerDebugEnabled()) return;
  console.log("[decoder-player]", label, {
    episodeId: el.dataset.episodeId ?? "",
    currentTime: Number(el.currentTime.toFixed(3)),
    duration: Number.isFinite(el.duration) ? Number(el.duration.toFixed(3)) : el.duration,
    readyState: el.readyState,
    networkState: el.networkState,
    paused: el.paused,
    seeking: el.seeking,
    buffered: bufferedRangesSummary(el),
    src: el.currentSrc || el.src,
    ...extra,
  });
}

export interface MediaState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loadError: boolean;
  bufferedPct: number;
  isInitialLoading: boolean;
  isSeekBuffering: boolean;
  resumeNotice: string | null;
  resumeHintVisible: boolean;
  hasClearableProgress: boolean;
}

export function initialMediaState(): MediaState {
  return {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loadError: false,
    bufferedPct: 0,
    isInitialLoading: false,
    isSeekBuffering: false,
    resumeNotice: null,
    resumeHintVisible: false,
    hasClearableProgress: false,
  };
}

export type MediaAction = { type: "reset" } | { type: "patch"; patch: Partial<MediaState> };

export function mediaReducer(state: MediaState, action: MediaAction): MediaState {
  if (action.type === "reset") {
    return initialMediaState();
  }
  return { ...state, ...action.patch };
}

export function subscribeGlobalPlayerAudio(
  el: HTMLAudioElement,
  dispatchMedia: Dispatch<MediaAction>,
  lastPersistAtRef: MutableRefObject<number>,
  t: (key: "playerResumingFrom", values: { time: string }) => string,
): () => void {
  const getEpisodeId = () => el.dataset.episodeId ?? "";

  const persistNow = () => {
    if (!Number.isFinite(el.duration) || el.duration <= 0) return;
    const id = getEpisodeId();
    if (!id) return;
    writeProgressSnapshot(id, el.currentTime, el.duration);
    dispatchMedia({
      type: "patch",
      patch: { hasClearableProgress: episodeHasStoredProgress(id) },
    });
  };

  const onPlay = () => {
    debugPlayerEvent("play", el);
    dispatchMedia({
      type: "patch",
      patch: { isPlaying: true, resumeNotice: null, resumeHintVisible: false },
    });
  };

  const onPause = () => {
    debugPlayerEvent("pause", el);
    dispatchMedia({ type: "patch", patch: { isPlaying: false } });
    persistNow();
  };

  const onEnded = () => {
    dispatchMedia({ type: "patch", patch: { isPlaying: false, hasClearableProgress: false } });
    const id = getEpisodeId();
    if (id) clearEpisodeProgress(id);
  };

  const onTime = () => {
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    dispatchMedia({ type: "patch", patch: { currentTime: el.currentTime, duration: d } });
    if (el.paused) return;
    const now = Date.now();
    if (now - lastPersistAtRef.current < GLOBAL_PLAYER_PERSIST_THROTTLE_MS) return;
    lastPersistAtRef.current = now;
    persistNow();
  };

  const onSeeked = () => {
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    const needsBuffer = d > 0 ? inferSeekNeedsBuffer(el, el.currentTime) : false;
    debugPlayerEvent("seeked", el, { needsBuffer });
    dispatchMedia({
      type: "patch",
      patch: {
        currentTime: el.currentTime,
        duration: d,
        ...(d > 0 ? { isSeekBuffering: needsBuffer } : {}),
      },
    });
    lastPersistAtRef.current = Date.now();
    persistNow();
  };

  const onMeta = () => {
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    if (d <= 0) {
      debugPlayerEvent("loadedmetadata", el, { durationReady: false });
      dispatchMedia({
        type: "patch",
        patch: { duration: d, isInitialLoading: false, isSeekBuffering: false },
      });
      return;
    }
    const id = getEpisodeId();
    if (!id) {
      debugPlayerEvent("loadedmetadata", el, { durationReady: true, hasEpisodeId: false });
      dispatchMedia({
        type: "patch",
        patch: { duration: d, isInitialLoading: false, isSeekBuffering: false },
      });
      return;
    }
    const saved = getSavedPosition(id, d);
    let currentTime = el.currentTime;
    let resumeNotice: string | null = null;
    if (saved !== null) {
      el.currentTime = saved;
      currentTime = saved;
      resumeNotice = t("playerResumingFrom", { time: formatPlaybackTime(saved) });
    }
    const has = episodeHasStoredProgress(id);
    debugPlayerEvent("loadedmetadata", el, {
      durationReady: true,
      saved,
      hasStoredProgress: has,
    });
    dispatchMedia({
      type: "patch",
      patch: {
        duration: d,
        currentTime,
        resumeNotice,
        hasClearableProgress: has,
        resumeHintVisible: has,
        // End "initial load" once metadata (and resume position) are applied; seek buffering after that comes from waiting/progress.
        isInitialLoading: false,
        isSeekBuffering: false,
      },
    });
  };

  const patchBufferTelemetry = (source: string) => {
    if (!Number.isFinite(el.duration) || el.duration <= 0) return;
    const maxEnd = getBufferedMaxEndSec(el);
    const pct = Math.min(100, (maxEnd / el.duration) * 100);
    const inferredSeekBuffering = inferSeekNeedsBuffer(el, el.currentTime);
    const shouldSurfaceSeekBuffering = el.seeking || !el.paused ? inferredSeekBuffering : false;
    debugPlayerEvent("buffer-telemetry", el, {
      source,
      bufferedPct: Number(pct.toFixed(2)),
      inferredSeekBuffering,
      surfacedSeekBuffering: shouldSurfaceSeekBuffering,
    });
    dispatchMedia({
      type: "patch",
      patch: {
        bufferedPct: pct,
        isSeekBuffering: shouldSurfaceSeekBuffering,
      },
    });
  };

  const onWaiting = () => {
    if (!el.seeking && el.paused) return;
    debugPlayerEvent("waiting", el);
    dispatchMedia({ type: "patch", patch: { isSeekBuffering: true } });
  };

  const onProgress = () => patchBufferTelemetry("progress");
  const onCanPlay = () => patchBufferTelemetry("canplay");
  const onLoadedData = () => patchBufferTelemetry("loadeddata");
  el.addEventListener("play", onPlay);
  el.addEventListener("pause", onPause);
  el.addEventListener("ended", onEnded);
  el.addEventListener("timeupdate", onTime);
  el.addEventListener("seeked", onSeeked);
  el.addEventListener("loadedmetadata", onMeta);
  el.addEventListener("progress", onProgress);
  el.addEventListener("canplay", onCanPlay);
  el.addEventListener("loadeddata", onLoadedData);
  el.addEventListener("waiting", onWaiting);
  el.addEventListener("stalled", onWaiting);
  const onError = () => {
    debugPlayerEvent("error", el);
    dispatchMedia({
      type: "patch",
      patch: { loadError: true, isInitialLoading: false, isSeekBuffering: false },
    });
  };
  el.addEventListener("error", onError);

  if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
    onMeta();
    patchBufferTelemetry("subscribe-init");
  }

  return () => {
    el.removeEventListener("play", onPlay);
    el.removeEventListener("pause", onPause);
    el.removeEventListener("ended", onEnded);
    el.removeEventListener("timeupdate", onTime);
    el.removeEventListener("seeked", onSeeked);
    el.removeEventListener("loadedmetadata", onMeta);
    el.removeEventListener("progress", onProgress);
    el.removeEventListener("canplay", onCanPlay);
    el.removeEventListener("loadeddata", onLoadedData);
    el.removeEventListener("waiting", onWaiting);
    el.removeEventListener("stalled", onWaiting);
    el.removeEventListener("error", onError);
  };
}
