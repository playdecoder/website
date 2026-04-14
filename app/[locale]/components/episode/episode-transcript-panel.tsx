"use client";

import { useTranslations } from "next-intl";
import { startTransition, useCallback, useEffect, useReducer, useRef, useState } from "react";

import { type TranscriptSegment, fetchEpisodeTranscript } from "@/lib/fetch-episode-transcript";

import { EpisodeTranscriptSurface } from "./episode-transcript-surface";

interface EpisodeTranscriptPanelProps {
  transcriptUrl?: string;
  seekToSeconds?: (seconds: number) => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

type TranscriptBundle = {
  loadState: LoadState;
  segments: TranscriptSegment[];
};

type BundleAction =
  | { type: "applyLoading" }
  | { type: "applyReady"; segments: TranscriptSegment[] }
  | { type: "applyError" };

function transcriptBundleReducer(state: TranscriptBundle, action: BundleAction): TranscriptBundle {
  switch (action.type) {
    case "applyLoading":
      return { ...state, loadState: "loading" };
    case "applyReady":
      return { loadState: "ready", segments: action.segments };
    case "applyError":
      return { ...state, loadState: "error" };
    default:
      return state;
  }
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function EpisodeTranscriptPanel({
  transcriptUrl,
  seekToSeconds,
}: EpisodeTranscriptPanelProps) {
  const t = useTranslations("listen");
  const [bundle, dispatchBundle] = useReducer(transcriptBundleReducer, {
    loadState: "idle",
    segments: [],
  });
  const { loadState, segments } = bundle;
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadGuardRef = useRef(false);

  const loadTranscript = useCallback(async () => {
    if (!transcriptUrl || loadGuardRef.current) return;
    loadGuardRef.current = true;
    dispatchBundle({ type: "applyLoading" });
    const result = await fetchEpisodeTranscript(transcriptUrl);
    loadGuardRef.current = false;
    if (!result.ok) {
      dispatchBundle({ type: "applyError" });
      return;
    }
    startTransition(() => {
      dispatchBundle({ type: "applyReady", segments: result.segments });
    });
  }, [transcriptUrl]);

  useEffect(() => {
    if (!transcriptUrl) return;
    queueMicrotask(() => {
      void loadTranscript();
    });
  }, [transcriptUrl, loadTranscript]);

  useEffect(() => {
    const audio = document.querySelector<HTMLAudioElement>("audio");
    if (!audio) return;
    const handler = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", handler, { passive: true });
    return () => audio.removeEventListener("timeupdate", handler);
  }, []);

  let activeIndex = -1;
  if (currentTime > 0) {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (currentTime >= segments[i].start) {
        activeIndex = i;
        break;
      }
    }
  }

  useEffect(() => {
    if (activeIndex === -1 || !activeRef.current || !scrollRef.current) return;
    const container = scrollRef.current;
    const el = activeRef.current;
    const elRelTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    const elRelBottom = el.getBoundingClientRect().bottom - container.getBoundingClientRect().top;
    if (elRelTop < 60 || elRelBottom > container.clientHeight - 40) {
      const target =
        container.scrollTop + elRelTop - container.clientHeight / 2 + el.offsetHeight / 2;
      container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  if (!transcriptUrl) return null;

  const filteredSegments = searchQuery.trim()
    ? segments.filter((s) => s.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : segments;

  function onSeek(seconds: number) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.hash = `t=${Math.max(0, Math.floor(seconds))}`;
    window.history.replaceState(null, "", url.toString());
    if (seekToSeconds) {
      seekToSeconds(seconds);
    } else {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  async function onCopy() {
    if (!segments.length) return;
    try {
      await navigator.clipboard.writeText(
        segments.map((s) => `[${formatClock(s.start)}]  ${s.text.trim()}`).join("\n\n"),
      );
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2200);
    } catch {}
  }

  return (
    <div className="relative">
      <div className="border-edge/40 bg-bg/20 flex items-center gap-2 border-b px-5 py-3 sm:gap-3 sm:px-7 md:px-8">
        <div className="relative flex-1">
          <svg
            className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            aria-hidden
          >
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M9 9L11.5 11.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("transcriptSearch")}
            className="border-edge/50 text-primary placeholder:text-muted/60 focus:border-accent/50 focus:bg-bg/30 w-full rounded-sm border bg-transparent py-2 pr-3 pl-8 font-mono text-[12px] tracking-wide transition-colors duration-150 outline-none sm:text-[13px]"
          />
        </div>

        <button
          type="button"
          onClick={() => void onCopy()}
          disabled={loadState !== "ready"}
          className={`border-edge/55 text-muted hover:border-edge hover:text-primary active:bg-surface/50 inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-3 py-2 font-mono text-[11px] tracking-[0.15em] uppercase transition-all ${
            loadState !== "ready" ? "invisible" : ""
          }`}
        >
          {copied ? (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                <path
                  d="M1.5 5.5L4 8.5L9.5 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("transcriptCopied")}
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                <rect
                  x="3.5"
                  y="3.5"
                  width="6.5"
                  height="6.5"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M3.5 3.5V2C3.5 1.17 4.17 0.5 5 0.5H9C9.83 0.5 10.5 1.17 10.5 2V6C10.5 6.83 9.83 7.5 9 7.5H7.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              {t("transcriptCopy")}
            </>
          )}
        </button>
      </div>

      <EpisodeTranscriptSurface
        loadState={loadState}
        segments={segments}
        filteredSegments={filteredSegments}
        searchQuery={searchQuery}
        activeIndex={activeIndex}
        scrollRef={scrollRef}
        activeRef={activeRef}
        onSeek={onSeek}
        onRetry={loadTranscript}
        t={t}
      />
    </div>
  );
}
