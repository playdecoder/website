import {
  clearEpisodeProgress,
  episodeHasStoredProgress,
  getSavedPosition,
  writeProgressSnapshot,
} from "@/lib/episode-progress-storage";
import { formatPlaybackTime } from "@/lib/format-playback-time";
import type { Dispatch, MutableRefObject } from "react";

export const GLOBAL_PLAYER_PERSIST_THROTTLE_MS = 2000;

export interface MediaState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loadError: boolean;
  bufferedPct: number;
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
    dispatchMedia({ type: "patch", patch: { currentTime: el.currentTime, duration: d } });
    lastPersistAtRef.current = Date.now();
    persistNow();
  };

  const onMeta = () => {
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    if (d <= 0) {
      dispatchMedia({ type: "patch", patch: { duration: d } });
      return;
    }
    const id = getEpisodeId();
    if (!id) {
      dispatchMedia({ type: "patch", patch: { duration: d } });
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
    dispatchMedia({
      type: "patch",
      patch: {
        duration: d,
        currentTime,
        resumeNotice,
        hasClearableProgress: has,
        resumeHintVisible: has,
      },
    });
  };

  const readBuffered = () => {
    if (!Number.isFinite(el.duration) || el.duration <= 0) return;
    let maxEnd = 0;
    for (let i = 0; i < el.buffered.length; i++) {
      maxEnd = Math.max(maxEnd, el.buffered.end(i));
    }
    const pct = Math.min(100, (maxEnd / el.duration) * 100);
    dispatchMedia({ type: "patch", patch: { bufferedPct: pct } });
  };

  el.addEventListener("play", onPlay);
  el.addEventListener("pause", onPause);
  el.addEventListener("ended", onEnded);
  el.addEventListener("timeupdate", onTime);
  el.addEventListener("seeked", onSeeked);
  el.addEventListener("loadedmetadata", onMeta);
  el.addEventListener("progress", readBuffered);
  const onError = () => dispatchMedia({ type: "patch", patch: { loadError: true } });
  el.addEventListener("error", onError);

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
    el.removeEventListener("error", onError);
  };
}
