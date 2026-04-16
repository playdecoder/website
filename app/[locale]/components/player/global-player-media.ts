import {
  clearEpisodeProgress,
  episodeHasStoredProgress,
  getSavedPosition,
  writeProgressSnapshot,
} from "@/lib/episode-progress-storage";
import { formatPlaybackTime } from "@/lib/format-playback-time";
import type { Dispatch, MutableRefObject } from "react";

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

export interface MediaState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loadError: boolean;
  bufferedPct: number;
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
    dispatchMedia({
      type: "patch",
      patch: { isPlaying: true, resumeNotice: null, resumeHintVisible: false },
    });
  };

  const onPause = () => {
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
    dispatchMedia({
      type: "patch",
      patch: {
        currentTime: el.currentTime,
        duration: d,
        ...(d > 0 ? { isSeekBuffering: inferSeekNeedsBuffer(el, el.currentTime) } : {}),
      },
    });
    lastPersistAtRef.current = Date.now();
    persistNow();
  };

  const onMeta = () => {
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    if (d <= 0) {
      dispatchMedia({ type: "patch", patch: { duration: d, isSeekBuffering: false } });
      return;
    }
    const id = getEpisodeId();
    if (!id) {
      dispatchMedia({ type: "patch", patch: { duration: d, isSeekBuffering: false } });
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
    const resumeNeedsBuffer = inferSeekNeedsBuffer(el, currentTime);
    dispatchMedia({
      type: "patch",
      patch: {
        duration: d,
        currentTime,
        resumeNotice,
        hasClearableProgress: has,
        resumeHintVisible: has,
        isSeekBuffering: resumeNeedsBuffer,
      },
    });
  };

  const patchBufferTelemetry = () => {
    if (!Number.isFinite(el.duration) || el.duration <= 0) return;
    const maxEnd = getBufferedMaxEndSec(el);
    const pct = Math.min(100, (maxEnd / el.duration) * 100);
    dispatchMedia({
      type: "patch",
      patch: {
        bufferedPct: pct,
        isSeekBuffering: inferSeekNeedsBuffer(el, el.currentTime),
      },
    });
  };

  const onWaiting = () => {
    dispatchMedia({ type: "patch", patch: { isSeekBuffering: true } });
  };

  el.addEventListener("play", onPlay);
  el.addEventListener("pause", onPause);
  el.addEventListener("ended", onEnded);
  el.addEventListener("timeupdate", onTime);
  el.addEventListener("seeked", onSeeked);
  el.addEventListener("loadedmetadata", onMeta);
  el.addEventListener("progress", patchBufferTelemetry);
  el.addEventListener("canplay", patchBufferTelemetry);
  el.addEventListener("loadeddata", patchBufferTelemetry);
  el.addEventListener("waiting", onWaiting);
  el.addEventListener("stalled", onWaiting);
  const onError = () =>
    dispatchMedia({ type: "patch", patch: { loadError: true, isSeekBuffering: false } });
  el.addEventListener("error", onError);

  if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
    onMeta();
    patchBufferTelemetry();
  }

  return () => {
    el.removeEventListener("play", onPlay);
    el.removeEventListener("pause", onPause);
    el.removeEventListener("ended", onEnded);
    el.removeEventListener("timeupdate", onTime);
    el.removeEventListener("seeked", onSeeked);
    el.removeEventListener("loadedmetadata", onMeta);
    el.removeEventListener("progress", patchBufferTelemetry);
    el.removeEventListener("canplay", patchBufferTelemetry);
    el.removeEventListener("loadeddata", patchBufferTelemetry);
    el.removeEventListener("waiting", onWaiting);
    el.removeEventListener("stalled", onWaiting);
    el.removeEventListener("error", onError);
  };
}
