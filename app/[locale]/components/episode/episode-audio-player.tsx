"use client";

import { useTranslations } from "next-intl";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { EpisodeHashChapter } from "@/lib/episode-hash";
import { resolveEpisodeSeekFromHash } from "@/lib/episode-hash";
import {
  clearEpisodeProgress,
  episodeHasStoredProgress,
  getSavedPosition,
  writeProgressSnapshot,
} from "@/lib/episode-progress-storage";
import { formatEpisodeTimeHash } from "@/lib/episode-time-fragment";
import { formatPlaybackTime } from "@/lib/format-playback-time";
import { readPlayerPreferences, writePlayerPreferences } from "@/lib/player-preferences-storage";

const PERSIST_THROTTLE_MS = 2000;
const SKIP_SEC = 15;
const PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2] as const;

function playbackRateToIndex(rate: number): number {
  const allowed = PLAYBACK_RATES;
  const exact = allowed.indexOf(rate as (typeof allowed)[number]);
  if (exact >= 0) {
    return exact;
  }
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < allowed.length; i++) {
    const d = Math.abs(allowed[i] - rate);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
const WAVE_SETTLE_TRANSITION =
  "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease 0.06s";
const WAVE_SETTLE_CLEANUP_MS = 1300;

const WAVEFORM_BARS = [
  { id: "wf-00", h: 22, dur: 0.72, delay: 0.0 },
  { id: "wf-01", h: 40, dur: 0.65, delay: 0.07 },
  { id: "wf-02", h: 58, dur: 0.81, delay: 0.14 },
  { id: "wf-03", h: 74, dur: 0.6, delay: 0.04 },
  { id: "wf-04", h: 64, dur: 0.89, delay: 0.18 },
  { id: "wf-05", h: 86, dur: 0.7, delay: 0.09 },
  { id: "wf-06", h: 78, dur: 0.55, delay: 0.21 },
  { id: "wf-07", h: 95, dur: 0.76, delay: 0.05 },
  { id: "wf-08", h: 88, dur: 0.83, delay: 0.12 },
  { id: "wf-09", h: 100, dur: 0.67, delay: 0.02 },
  { id: "wf-10", h: 96, dur: 0.79, delay: 0.15 },
  { id: "wf-11", h: 90, dur: 0.58, delay: 0.08 },
  { id: "wf-12", h: 82, dur: 0.91, delay: 0.19 },
  { id: "wf-13", h: 92, dur: 0.69, delay: 0.03 },
  { id: "wf-14", h: 76, dur: 0.77, delay: 0.11 },
  { id: "wf-15", h: 66, dur: 0.62, delay: 0.16 },
  { id: "wf-16", h: 56, dur: 0.85, delay: 0.01 },
  { id: "wf-17", h: 44, dur: 0.73, delay: 0.1 },
  { id: "wf-18", h: 30, dur: 0.66, delay: 0.17 },
  { id: "wf-19", h: 20, dur: 0.79, delay: 0.06 },
] as const;

interface PlayerState {
  playing: boolean;
  position: number;
  duration: number;
  loadError: boolean;
  resumeNotice: string | null;
  hasClearableProgress: boolean;
}

type PlayerAction =
  | { type: "sync"; position: number; duration: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "ended" }
  | {
      type: "meta";
      duration: number;
      resume: number | null;
      resumeNotice: string | null;
    }
  | { type: "loadError"; value: boolean }
  | { type: "setPosition"; position: number }
  | { type: "clearable"; value: boolean }
  | { type: "refreshClearable"; episodeId: string };

function initPlayerState(_episodeId: string): PlayerState {
  return {
    playing: false,
    position: 0,
    duration: 0,
    loadError: false,
    resumeNotice: null,
    hasClearableProgress: false,
  };
}

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "sync":
      return { ...state, position: action.position, duration: action.duration };
    case "play":
      return { ...state, playing: true, resumeNotice: null };
    case "pause":
      return { ...state, playing: false };
    case "ended":
      return { ...state, playing: false, hasClearableProgress: false };
    case "meta":
      return {
        ...state,
        loadError: false,
        duration: action.duration,
        position: action.resume !== null ? action.resume : state.position,
        resumeNotice: action.resumeNotice,
      };
    case "loadError":
      return { ...state, loadError: action.value };
    case "setPosition":
      return { ...state, position: action.position, resumeNotice: null };
    case "clearable":
      return { ...state, hasClearableProgress: action.value };
    case "refreshClearable":
      return {
        ...state,
        hasClearableProgress: episodeHasStoredProgress(action.episodeId),
      };
    default:
      return state;
  }
}

export interface EpisodeAudioPlayerHandle {
  seekToSeconds: (seconds: number) => void;
}

interface EpisodeAudioPlayerProps {
  src: string;
  episodeId: string;
  title: string;
  chapters?: EpisodeHashChapter[];
  onPlaybackTick?: (currentTime: number, duration: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) {
    return false;
  }
  if (el.isContentEditable) {
    return true;
  }
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (tag !== "INPUT") {
    return false;
  }
  const { type } = el as HTMLInputElement;
  return type !== "button" && type !== "submit" && type !== "checkbox" && type !== "radio";
}

function shortcutConsumingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    el.closest(
      "button, a[href], [role='slider'], input, textarea, select, [contenteditable='true']",
    ),
  );
}

function VolumeIcon({ muted, volume }: { muted: boolean; volume: number }) {
  if (muted || volume === 0) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  if (volume < 0.45) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

const EpisodeAudioPlayerImpl = forwardRef<EpisodeAudioPlayerHandle, EpisodeAudioPlayerProps>(
  function EpisodeAudioPlayerImpl(
    { src, episodeId, title, chapters, onPlaybackTick, onPlayingChange },
    ref,
  ) {
    const t = useTranslations("listen");
    const audioRef = useRef<HTMLAudioElement>(null);
    const waveformRef = useRef<HTMLDivElement>(null);
    const settleRafRef = useRef<number | null>(null);
    const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [player, dispatchPlayer] = useReducer(playerReducer, episodeId, initPlayerState);
    type AudioUiPrefs = {
      volume: number;
      muted: boolean;
      rateIdx: number;
      prefsHydrated: boolean;
    };
    const [audioUi, setAudioUi] = useState<AudioUiPrefs>({
      volume: 1,
      muted: false,
      rateIdx: 0,
      prefsHydrated: false,
    });
    const { volume, muted, rateIdx, prefsHydrated } = audioUi;
    const scrubbingRef = useRef(false);
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
    const [bufferedPct, setBufferedPct] = useState(0);
    const scrubValueRef = useRef(0);
    const lastPersistAtRef = useRef(0);
    const onPlaybackTickRef = useRef(onPlaybackTick);
    const onPlayingChangeRef = useRef(onPlayingChange);
    const playbackRate = PLAYBACK_RATES[rateIdx];

    useEffect(() => {
      onPlaybackTickRef.current = onPlaybackTick;
    }, [onPlaybackTick]);

    useEffect(() => {
      onPlayingChangeRef.current = onPlayingChange;
    }, [onPlayingChange]);

    useEffect(() => {
      queueMicrotask(() => {
        const p = readPlayerPreferences();
        setAudioUi((prev) => ({
          ...prev,
          volume: p.volume,
          muted: p.muted,
          rateIdx: playbackRateToIndex(p.playbackRate),
          prefsHydrated: true,
        }));
      });
    }, []);

    useEffect(() => {
      if (!prefsHydrated) {
        return;
      }
      writePlayerPreferences({
        volume,
        muted,
        playbackRate: PLAYBACK_RATES[rateIdx],
      });
    }, [prefsHydrated, volume, muted, rateIdx]);

    useEffect(() => {
      dispatchPlayer({ type: "refreshClearable", episodeId });
    }, [episodeId]);

    const emitPlaybackTick = useCallback(() => {
      const el = audioRef.current;
      const tick = onPlaybackTickRef.current;
      if (!el || !tick) {
        return;
      }
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      tick(el.currentTime, d);
    }, []);

    useEffect(() => {
      const el = audioRef.current;
      if (el) {
        el.playbackRate = playbackRate;
      }
    }, [playbackRate, src]);

    const clearWaveSettleStyles = useCallback((bar: HTMLElement) => {
      bar.style.animation = "";
      bar.style.transform = "";
      bar.style.transition = "";
      bar.style.opacity = "";
    }, []);

    const cancelWaveSettle = useCallback(() => {
      if (settleRafRef.current !== null) {
        cancelAnimationFrame(settleRafRef.current);
        settleRafRef.current = null;
      }
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    }, []);

    const resetWaveformForPlay = useCallback(() => {
      cancelWaveSettle();
      const container = waveformRef.current;
      if (!container) return;
      container
        .querySelectorAll<HTMLElement>(".decoder-waveform-bar")
        .forEach(clearWaveSettleStyles);
    }, [cancelWaveSettle, clearWaveSettleStyles]);

    const settleWaveformBars = useCallback(() => {
      cancelWaveSettle();
      const container = waveformRef.current;
      if (!container) return;
      const bars = Array.from(container.querySelectorAll<HTMLElement>(".decoder-waveform-bar"));
      if (bars.length === 0) return;

      bars.forEach((bar) => {
        const liveTransform = getComputedStyle(bar).transform;
        bar.style.animation = "none";
        bar.style.transform = liveTransform;
        bar.style.transition = "none";
        bar.style.opacity = "0.88";
      });

      settleRafRef.current = requestAnimationFrame(() => {
        settleRafRef.current = requestAnimationFrame(() => {
          settleRafRef.current = null;
          bars.forEach((bar) => {
            bar.style.transition = WAVE_SETTLE_TRANSITION;
            bar.style.transform = "scaleY(0.1)";
            bar.style.opacity = "0.32";
          });
          settleTimerRef.current = setTimeout(() => {
            bars.forEach(clearWaveSettleStyles);
            settleTimerRef.current = null;
          }, WAVE_SETTLE_CLEANUP_MS);
        });
      });
    }, [cancelWaveSettle, clearWaveSettleStyles]);

    useEffect(() => {
      return () => {
        cancelWaveSettle();
      };
    }, [cancelWaveSettle]);

    const progressPct = useMemo(() => {
      if (player.duration <= 0) {
        return 0;
      }
      return Math.min(100, Math.max(0, (player.position / player.duration) * 100));
    }, [player]);

    const syncFromAudio = useCallback(() => {
      const el = audioRef.current;
      if (!el || scrubbingRef.current) {
        return;
      }
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      dispatchPlayer({ type: "sync", position: el.currentTime, duration: d });
      emitPlaybackTick();
    }, [emitPlaybackTick]);

    const seekTo = useCallback(
      (next: number) => {
        const el = audioRef.current;
        if (!el) {
          return;
        }
        const d =
          Number.isFinite(el.duration) && el.duration > 0
            ? el.duration
            : Number.isFinite(player.duration) && player.duration > 0
              ? player.duration
              : 0;
        if (d > 0) {
          const clamped = Math.max(0, Math.min(d, next));
          el.currentTime = clamped;
          dispatchPlayer({ type: "setPosition", position: clamped });
        } else {
          el.currentTime = Math.max(0, next);
          dispatchPlayer({ type: "setPosition", position: el.currentTime });
        }
        emitPlaybackTick();
      },
      [player.duration, emitPlaybackTick],
    );

    useImperativeHandle(
      ref,
      () => ({
        seekToSeconds: (seconds: number) => {
          seekTo(seconds);
        },
      }),
      [seekTo],
    );

    useEffect(() => {
      const el = audioRef.current;
      if (!el) {
        return;
      }

      const persistNow = () => {
        if (!Number.isFinite(el.duration) || el.duration <= 0) {
          return;
        }
        writeProgressSnapshot(episodeId, el.currentTime, el.duration);
        dispatchPlayer({ type: "refreshClearable", episodeId });
      };

      const onPlay = () => {
        resetWaveformForPlay();
        dispatchPlayer({ type: "play" });
        onPlayingChangeRef.current?.(true);
      };
      const onPause = () => {
        settleWaveformBars();
        dispatchPlayer({ type: "pause" });
        persistNow();
        onPlayingChangeRef.current?.(false);
      };
      const onEnded = () => {
        settleWaveformBars();
        clearEpisodeProgress(episodeId);
        dispatchPlayer({ type: "ended" });
        onPlayingChangeRef.current?.(false);
      };
      const onTime = () => {
        syncFromAudio();
        if (el.paused) {
          return;
        }
        const now = Date.now();
        if (now - lastPersistAtRef.current < PERSIST_THROTTLE_MS) {
          return;
        }
        lastPersistAtRef.current = now;
        persistNow();
      };
      const onSeeked = () => {
        syncFromAudio();
        lastPersistAtRef.current = Date.now();
        persistNow();
      };
      const onMeta = () => {
        const d = Number.isFinite(el.duration) ? el.duration : 0;
        let resume: number | null = null;
        let resumeNotice: string | null = null;

        let fromHash = false;
        if (typeof window !== "undefined" && d > 0) {
          const resolved = resolveEpisodeSeekFromHash(window.location.hash, chapters, d);
          if (resolved.seconds !== null) {
            fromHash = true;
            const at = resolved.seconds;
            el.currentTime = at;
            resume = at;
            resumeNotice = resolved.fromChapter
              ? t("playerResumeFromChapter", {
                  label: resolved.chapterLabel ?? "",
                  time: formatPlaybackTime(at),
                })
              : t("playerResumeFromShare", { time: formatPlaybackTime(at) });
          }
        }

        if (!fromHash) {
          resume = getSavedPosition(episodeId, d);
          if (resume !== null) {
            el.currentTime = resume;
          }
          resumeNotice =
            resume !== null ? t("playerResumingFrom", { time: formatPlaybackTime(resume) }) : null;
        }

        dispatchPlayer({
          type: "meta",
          duration: d,
          resume,
          resumeNotice,
        });
        emitPlaybackTick();
      };
      const onErr = () => dispatchPlayer({ type: "loadError", value: true });

      const readBuffered = () => {
        if (!Number.isFinite(el.duration) || el.duration <= 0) {
          return;
        }
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
      el.addEventListener("error", onErr);

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
        el.removeEventListener("error", onErr);
      };
    }, [
      src,
      syncFromAudio,
      episodeId,
      emitPlaybackTick,
      t,
      chapters,
      resetWaveformForPlay,
      settleWaveformBars,
    ]);

    useEffect(() => {
      const onHashChange = () => {
        const el = audioRef.current;
        const d =
          el && Number.isFinite(el.duration) && el.duration > 0
            ? el.duration
            : Number.isFinite(player.duration) && player.duration > 0
              ? player.duration
              : 0;
        if (d <= 0) {
          return;
        }
        const resolved = resolveEpisodeSeekFromHash(window.location.hash, chapters, d);
        if (resolved.seconds === null) {
          return;
        }
        seekTo(resolved.seconds);
      };
      window.addEventListener("hashchange", onHashChange);
      return () => window.removeEventListener("hashchange", onHashChange);
    }, [seekTo, player.duration, chapters]);

    useEffect(() => {
      const flush = () => {
        const el = audioRef.current;
        if (!el || player.loadError) {
          return;
        }
        if (!Number.isFinite(el.duration) || el.duration <= 0) {
          return;
        }
        writeProgressSnapshot(episodeId, el.currentTime, el.duration);
        dispatchPlayer({ type: "refreshClearable", episodeId });
      };
      const onVis = () => {
        if (document.visibilityState === "hidden") {
          flush();
        }
      };
      window.addEventListener("pagehide", flush);
      document.addEventListener("visibilitychange", onVis);
      return () => {
        window.removeEventListener("pagehide", flush);
        document.removeEventListener("visibilitychange", onVis);
      };
    }, [episodeId, player.loadError]);

    useEffect(() => {
      const el = audioRef.current;
      if (!el) {
        return;
      }
      el.volume = volume;
      el.muted = muted;
    }, [volume, muted]);

    const togglePlay = useCallback(() => {
      const el = audioRef.current;
      if (!el || player.loadError) {
        return;
      }
      if (el.paused) {
        el.play().catch(() => dispatchPlayer({ type: "loadError", value: true }));
      } else {
        el.pause();
      }
    }, [player.loadError]);

    const skip = useCallback(
      (delta: number) => {
        seekTo(player.position + delta);
      },
      [player.position, seekTo],
    );

    const toggleMute = useCallback(() => {
      setAudioUi((prev) => {
        if (prev.muted) {
          return { ...prev, muted: false };
        }
        if (prev.volume > 0) {
          return { ...prev, muted: true };
        }
        return { ...prev, volume: 0.85, muted: false };
      });
    }, []);

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.defaultPrevented) {
          return;
        }
        if (isTypingTarget(e.target)) {
          return;
        }

        if (e.code === "Space" || e.key === " " || e.key === "k" || e.key === "K") {
          if (shortcutConsumingTarget(e.target)) {
            return;
          }
          e.preventDefault();
          togglePlay();
          return;
        }

        if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
          e.preventDefault();
          skip(e.code === "ArrowLeft" ? -SKIP_SEC : SKIP_SEC);
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [togglePlay, skip]);

    const onProgressChange = (v: number) => {
      scrubValueRef.current = v;
      if (player.duration > 0) {
        dispatchPlayer({ type: "setPosition", position: (v / 100) * player.duration });
      }
    };

    const onProgressCommit = () => {
      const el = audioRef.current;
      scrubbingRef.current = false;
      if (el && player.duration > 0) {
        const targetTime = (scrubValueRef.current / 100) * player.duration;
        el.currentTime = targetTime;
        writeProgressSnapshot(episodeId, targetTime, player.duration);
        dispatchPlayer({ type: "refreshClearable", episodeId });
      }
      emitPlaybackTick();
    };

    const cycleRate = () => {
      setAudioUi((prev) => ({
        ...prev,
        rateIdx: (prev.rateIdx + 1) % PLAYBACK_RATES.length,
      }));
    };

    const rateLabel = playbackRate === 1 ? "1×" : `${playbackRate}×`;

    const copyEpisodeLink = async () => {
      try {
        const url = new URL(window.location.href);
        url.hash = formatEpisodeTimeHash(player.position);
        await navigator.clipboard.writeText(url.toString());
        setCopyStatus("copied");
        window.setTimeout(() => setCopyStatus("idle"), 2000);
      } catch {
        setCopyStatus("error");
        window.setTimeout(() => setCopyStatus("idle"), 2800);
      }
    };

    return (
      <section
        className={`decoder-audio-player relative overflow-hidden rounded-sm border backdrop-blur-md duration-300 motion-safe:transition-[border-color,box-shadow] ${
          player.loadError
            ? "border-secondary/40 bg-surface/90 dark:bg-surface/60 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--secondary)_8%,transparent)]"
            : "border-edge bg-surface/85 dark:bg-surface/55 hover:border-secondary/35 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--secondary)_12%,transparent)]"
        }`}
        style={{ animation: "fadeUp 0.7s ease both 0.18s" }}
        data-playing={player.playing}
        data-load-error={player.loadError || undefined}
        aria-label={t("playerAriaLabel", { id: episodeId })}
      >
        <div
          className="dot-grid pointer-events-none absolute inset-0 opacity-[0.2] dark:opacity-[0.35]"
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent to-transparent transition-all duration-500 ease-out ${player.playing ? "via-accent/55" : "via-secondary/30"}`}
          aria-hidden
        />

        <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

        <div className="relative p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-muted mb-1 font-mono text-[10px] tracking-[0.22em] uppercase sm:text-[11px]">
                  {t("playerKicker")}
                </p>
                <p className="font-display text-primary line-clamp-2 pr-2 text-sm leading-snug font-semibold sm:text-base">
                  <span className="text-accent-text mr-2 font-mono text-xs tracking-widest sm:text-sm">
                    {episodeId}
                  </span>
                  {title}
                </p>
                <p
                  className={`mt-2 font-mono text-[10px] tracking-wide transition-opacity duration-500 sm:text-[11px] ${
                    player.resumeNotice
                      ? "text-muted/75 opacity-100"
                      : "pointer-events-none opacity-0 select-none"
                  }`}
                  role="status"
                  aria-hidden={!player.resumeNotice || undefined}
                >
                  {player.resumeNotice ?? "\u00a0"}
                </p>
              </div>

              <div
                ref={waveformRef}
                className="flex h-8 shrink-0 items-center gap-[2px] sm:h-10 sm:gap-[3px]"
                aria-hidden
              >
                {WAVEFORM_BARS.map((bar) => (
                  <span
                    key={bar.id}
                    className="decoder-waveform-bar bg-secondary w-[2px] rounded-[1px]"
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
            </div>

            {player.loadError ? (
              <div
                className="border-secondary/25 relative overflow-hidden rounded-sm border bg-[linear-gradient(105deg,color-mix(in_srgb,var(--secondary)_7%,transparent)_0%,transparent_42%,transparent_100%)] dark:bg-[linear-gradient(105deg,color-mix(in_srgb,var(--secondary)_12%,transparent)_0%,transparent_45%,transparent_100%)]"
                role="alert"
              >
                <div
                  className="from-secondary/90 via-secondary/50 to-secondary/20 absolute top-0 bottom-0 left-0 w-0.5 bg-gradient-to-b"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-12deg,transparent,transparent_3px,color-mix(in_srgb,var(--secondary)_50%,transparent)_3px,color-mix(in_srgb,var(--secondary)_50%,transparent)_4px)] opacity-[0.07] motion-reduce:hidden dark:opacity-[0.12]"
                  aria-hidden
                />
                <div className="relative flex gap-3 py-3 pr-3 pl-3.5 sm:gap-4 sm:py-3.5 sm:pl-4">
                  <span
                    className="border-secondary/30 bg-bg/60 dark:bg-bg/25 text-secondary flex size-9 shrink-0 items-center justify-center rounded-sm border"
                    aria-hidden
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="opacity-95"
                    >
                      <path
                        d="M5 17V7M10 17v-6M10 5v1M15 17V7M19 19L5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0 space-y-1.5 pt-0.5">
                    <p className="text-secondary font-mono text-[9px] tracking-[0.22em] uppercase sm:text-[10px]">
                      {t("playerLoadErrorKicker")}
                    </p>
                    <p className="text-primary font-mono text-[11px] leading-[1.65] tracking-[0.02em] sm:text-xs">
                      {t("playerLoadError")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 space-y-2 sm:order-2 sm:flex-1 sm:space-y-2.5">
                <div className="text-muted flex items-center justify-between gap-3 font-mono text-[11px] tracking-widest tabular-nums sm:text-xs">
                  <span className="text-primary">{formatPlaybackTime(player.position)}</span>
                  <span className="text-edge" aria-hidden>
                    /
                  </span>
                  <span>{formatPlaybackTime(player.duration)}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={progressPct}
                  disabled={player.loadError || player.duration <= 0}
                  onPointerDown={() => {
                    scrubbingRef.current = true;
                  }}
                  onChange={(e) => onProgressChange(Number(e.target.value))}
                  onPointerUp={onProgressCommit}
                  onPointerCancel={onProgressCommit}
                  className="decoder-audio-progress w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
                  style={
                    {
                      "--decoder-progress": `${progressPct}%`,
                      "--decoder-buffered": `${Math.max(progressPct, bufferedPct)}%`,
                    } as CSSProperties
                  }
                  aria-label={t("playerSeek")}
                />

                <div className="flex justify-end pt-0.5">
                  {player.hasClearableProgress ? (
                    <button
                      type="button"
                      onClick={() => {
                        clearEpisodeProgress(episodeId);
                        seekTo(0);
                        dispatchPlayer({ type: "clearable", value: false });
                      }}
                      disabled={player.loadError}
                      className="text-muted/55 hover:text-muted hover:border-edge/70 border-b border-transparent pb-px font-mono text-[10px] tracking-[0.14em] uppercase transition-colors disabled:opacity-35"
                      aria-label={t("playerClearProgressAria")}
                    >
                      {t("playerClearProgress")}
                    </button>
                  ) : (
                    <span
                      className="invisible border-b border-transparent pb-px font-mono text-[10px] tracking-[0.14em] uppercase"
                      aria-hidden
                    >
                      {t("playerClearProgress")}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 sm:order-1">
                <div className="flex items-center justify-center gap-3 sm:hidden">
                  <button
                    type="button"
                    onClick={() => skip(-SKIP_SEC)}
                    disabled={player.loadError || player.duration <= 0}
                    className="border-edge text-muted hover:border-secondary/40 hover:text-primary active:bg-surface-2 flex size-12 shrink-0 items-center justify-center gap-1 rounded-sm border transition-colors disabled:pointer-events-none disabled:opacity-35"
                    aria-label={t("playerSkipBack")}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M11 18V6l-8.5 6 8.5 6zm1-6l8.5 6V6l-8.5 6z" />
                    </svg>
                    <span className="font-mono text-[10px] tracking-widest">{SKIP_SEC}</span>
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={player.loadError}
                    className="group border-primary/15 bg-accent focus-visible:outline-accent relative flex size-[3.75rem] shrink-0 items-center justify-center rounded-sm border-2 text-[#0b0f14] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-200 hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                    aria-label={player.playing ? t("playerPause") : t("playerPlay")}
                  >
                    <span className="decoder-play-ring" aria-hidden />
                    {player.playing ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                        className="translate-x-px"
                      >
                        <path d="M8 5v14l11-7L8 5z" />
                      </svg>
                    )}
                    <span
                      className="pointer-events-none absolute inset-0 rounded-sm bg-[radial-gradient(circle_at_30%_30%,rgb(255_255_255/0.45),transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => skip(SKIP_SEC)}
                    disabled={player.loadError || player.duration <= 0}
                    className="border-edge text-muted hover:border-secondary/40 hover:text-primary active:bg-surface-2 flex size-12 shrink-0 items-center justify-center gap-1 rounded-sm border transition-colors disabled:pointer-events-none disabled:opacity-35"
                    aria-label={t("playerSkipForward")}
                  >
                    <span className="font-mono text-[10px] tracking-widest">{SKIP_SEC}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                    </svg>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={player.loadError}
                  className="group border-primary/15 bg-accent focus-visible:outline-accent relative hidden size-14 shrink-0 items-center justify-center rounded-sm border-2 text-[#0b0f14] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-200 hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 sm:flex"
                  aria-label={player.playing ? t("playerPause") : t("playerPlay")}
                >
                  <span className="decoder-play-ring" aria-hidden />
                  {player.playing ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden
                      className="translate-x-px"
                    >
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                  )}
                  <span
                    className="pointer-events-none absolute inset-0 rounded-sm bg-[radial-gradient(circle_at_30%_30%,rgb(255_255_255/0.45),transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:contents">
                <button
                  type="button"
                  onClick={() => skip(-SKIP_SEC)}
                  disabled={player.loadError || player.duration <= 0}
                  className="decoder-audio-chip inline-flex"
                  aria-label={t("playerSkipBack")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M11 18V6l-8.5 6 8.5 6zm1-6l8.5 6V6l-8.5 6z" />
                  </svg>
                  <span className="font-mono text-[10px] tracking-widest">{SKIP_SEC}</span>
                </button>
                <button
                  type="button"
                  onClick={() => skip(SKIP_SEC)}
                  disabled={player.loadError || player.duration <= 0}
                  className="decoder-audio-chip inline-flex"
                  aria-label={t("playerSkipForward")}
                >
                  <span className="font-mono text-[10px] tracking-widest">{SKIP_SEC}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                  </svg>
                </button>
              </div>

              <div className="border-edge/60 flex h-11 w-full overflow-hidden rounded-sm border bg-[color-mix(in_srgb,var(--surface-2)_88%,transparent)] sm:hidden">
                <button
                  type="button"
                  onClick={cycleRate}
                  disabled={player.loadError}
                  className="hover:bg-surface-2/60 active:bg-surface-2 flex flex-1 items-center justify-center transition-colors disabled:opacity-35"
                  aria-label={t("playerPlaybackRateAria", { rate: rateLabel })}
                >
                  <span className="text-muted font-mono text-[11px] tracking-widest tabular-nums">
                    {rateLabel}
                  </span>
                </button>
                <span className="bg-edge/50 w-px self-stretch" aria-hidden />
                <button
                  type="button"
                  onClick={copyEpisodeLink}
                  disabled={player.loadError}
                  className="hover:bg-surface-2/60 active:bg-surface-2 flex flex-1 items-center justify-center gap-1.5 transition-colors disabled:opacity-35"
                  aria-label={t("playerCopyMomentAria", {
                    time: formatPlaybackTime(player.position),
                  })}
                >
                  {copyStatus === "copied" ? (
                    <span className="text-accent-text font-mono text-[10px] tracking-[0.16em] uppercase">
                      {t("playerCopied")}
                    </span>
                  ) : copyStatus === "error" ? (
                    <span className="text-secondary font-mono text-[10px] tracking-[0.16em] uppercase">
                      {t("playerCopyFailed")}
                    </span>
                  ) : (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="text-accent-text shrink-0"
                        aria-hidden
                      >
                        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                      </svg>
                      <span className="text-primary font-mono text-[11px] tracking-[0.06em] tabular-nums">
                        {formatPlaybackTime(player.position)}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={cycleRate}
                disabled={player.loadError}
                className="decoder-audio-chip hidden w-[4rem] justify-center sm:inline-flex"
                aria-label={t("playerPlaybackRateAria", { rate: rateLabel })}
              >
                <span className="font-mono text-[10px] tracking-widest tabular-nums">
                  {rateLabel}
                </span>
              </button>

              <button
                type="button"
                onClick={copyEpisodeLink}
                disabled={player.loadError}
                className="decoder-audio-chip decoder-audio-moment-link border-primary/10 from-surface-2 relative hidden min-w-[9.5rem] overflow-hidden bg-gradient-to-br to-transparent px-2.5 py-1.5 pl-2 sm:inline-flex"
                aria-label={t("playerCopyMomentAria", {
                  time: formatPlaybackTime(player.position),
                })}
              >
                <span
                  className="bg-accent absolute top-0 bottom-0 left-0 w-px opacity-90"
                  aria-hidden
                />
                <span
                  className="border-edge/80 text-accent-text flex size-7 shrink-0 items-center justify-center rounded-[3px] border bg-[color-mix(in_srgb,var(--surface-2)_92%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--primary)_8%,transparent)]"
                  aria-hidden
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 text-left">
                  {copyStatus === "copied" ? (
                    <span className="text-accent-text font-mono text-[10px] tracking-[0.16em] uppercase">
                      {t("playerCopied")}
                    </span>
                  ) : copyStatus === "error" ? (
                    <span className="text-secondary font-mono text-[10px] tracking-[0.16em] uppercase">
                      {t("playerCopyFailed")}
                    </span>
                  ) : (
                    <>
                      <span className="text-muted/55 mb-0.5 block font-mono text-[8px] tracking-[0.2em] uppercase sm:text-[9px]">
                        {t("playerCopyMomentKicker")}
                      </span>
                      <span className="text-primary font-mono text-[11px] leading-none tracking-[0.06em] tabular-nums sm:text-xs">
                        {formatPlaybackTime(player.position)}
                      </span>
                    </>
                  )}
                </span>
              </button>

              <div className="hidden sm:ml-auto sm:flex sm:min-w-[min(100%,12rem)] sm:flex-1 sm:items-center sm:justify-end sm:gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={player.loadError}
                  className="border-edge text-muted hover:border-secondary/40 hover:text-primary active:bg-surface-2 flex size-11 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-35"
                  aria-label={muted || volume === 0 ? t("playerUnmute") : t("playerMute")}
                >
                  <VolumeIcon muted={muted} volume={volume} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={muted ? 0 : volume}
                  disabled={player.loadError}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAudioUi((prev) => ({ ...prev, volume: v, muted: v === 0 }));
                  }}
                  className="decoder-audio-volume flex-1 disabled:opacity-35 sm:max-w-[10rem]"
                  style={{ "--decoder-vol": `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
                  aria-label={t("playerVolume")}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={toggleMute}
                disabled={player.loadError}
                className="border-edge text-muted hover:border-secondary/40 hover:text-primary active:bg-surface-2 flex size-11 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-35"
                aria-label={muted || volume === 0 ? t("playerUnmute") : t("playerMute")}
              >
                <VolumeIcon muted={muted} volume={volume} />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={muted ? 0 : volume}
                disabled={player.loadError}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAudioUi((prev) => ({ ...prev, volume: v, muted: v === 0 }));
                }}
                className="decoder-audio-volume flex-1 disabled:opacity-35"
                style={{ "--decoder-vol": `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
                aria-label={t("playerVolume")}
              />
            </div>

            <details className="group border-edge/50 mt-0.5 hidden border-t pt-3 sm:block">
              <summary className="text-muted/55 hover:text-muted flex cursor-pointer list-none items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors select-none [&::-webkit-details-marker]:hidden">
                <span
                  className="border-edge/70 text-muted/90 inline-flex size-5 items-center justify-center rounded-sm border text-[11px] font-semibold"
                  aria-hidden
                >
                  ?
                </span>
                {t("playerShortcutsHint")}
              </summary>
              <ul className="text-muted/75 mt-2.5 list-none space-y-1.5 pl-0.5 font-mono text-[10px] tracking-wide sm:text-[11px]">
                <li>{t("playerShortcutPlayPause")}</li>
                <li>{t("playerShortcutSeek")}</li>
              </ul>
            </details>
          </div>
        </div>
      </section>
    );
  },
);

EpisodeAudioPlayerImpl.displayName = "EpisodeAudioPlayer";

export const EpisodeAudioPlayer = forwardRef<EpisodeAudioPlayerHandle, EpisodeAudioPlayerProps>(
  function EpisodeAudioPlayer(props, ref) {
    return <EpisodeAudioPlayerImpl key={`${props.src}::${props.episodeId}`} ref={ref} {...props} />;
  },
);

EpisodeAudioPlayer.displayName = "EpisodeAudioPlayer";
