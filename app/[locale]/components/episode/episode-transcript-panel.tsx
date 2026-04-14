"use client";

import { useTranslations } from "next-intl";
import { startTransition, useEffect, useRef, useState } from "react";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptPayload {
  segments?: TranscriptSegment[];
}

interface EpisodeTranscriptPanelProps {
  transcriptUrl?: string;
  /** Direct player seek — bypasses the hash-tick race condition. */
  seekToSeconds?: (seconds: number) => void;
}

type LoadState = "idle" | "loading" | "ready" | "error";

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
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-load on mount. transcriptUrl is a stable prop — stale closure is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (transcriptUrl) void loadTranscript();
  }, []);

  useEffect(() => {
    const audio = document.querySelector<HTMLAudioElement>("audio");
    if (!audio) return;
    const handler = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", handler, { passive: true });
    return () => audio.removeEventListener("timeupdate", handler);
  }, []);

  // Active segment: last segment whose start ≤ currentTime.
  let activeIndex = -1;
  if (currentTime > 0) {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (currentTime >= segments[i].start) {
        activeIndex = i;
        break;
      }
    }
  }

  // Scroll active segment into view — container only, never the page.
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

  async function loadTranscript() {
    if (!transcriptUrl || loadState === "loading") return;
    setLoadState("loading");
    try {
      const res = await fetch(transcriptUrl, { cache: "force-cache" });
      if (!res.ok) throw new Error(`${res.status}`);
      const payload = (await res.json()) as TranscriptPayload;
      const next = Array.isArray(payload.segments)
        ? payload.segments.filter((s) => typeof s.text === "string")
        : [];
      startTransition(() => {
        setSegments(next);
        setLoadState("ready");
      });
    } catch {
      setLoadState("error");
    }
  }

  function onSeek(seconds: number) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.hash = `t=${Math.max(0, Math.floor(seconds))}`;
    window.history.replaceState(null, "", url.toString());
    // Direct seek bypasses the race where the player's own hash tick overwrites the
    // seek target between replaceState and the hashchange handler firing.
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
    } catch {
      // clipboard access may be blocked silently
    }
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

        {/* Always rendered so the toolbar width is stable; invisible until ready */}
        <button
          type="button"
          onClick={() => void onCopy()}
          disabled={loadState !== "ready"}
          className={`border-edge/55 text-muted hover:border-edge hover:text-primary active:bg-surface/50 inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-3 py-2 font-mono text-[11px] tracking-[0.15em] uppercase transition-all duration-150 ${
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

      {/* Transcript content — fixed height on the wrapper prevents layout jumps
          between the loading, error, and ready states. */}
      <div className="relative h-[22rem]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7"
          aria-hidden
          style={{ background: "linear-gradient(to bottom, var(--surface), transparent)" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12"
          aria-hidden
          style={{ background: "linear-gradient(to top, var(--surface), transparent)" }}
        />

        {/* Show skeleton for both idle and loading — the idle→loading transition
            is a single React flush so without this there's a blank frame on first render. */}
        {(loadState === "idle" || loadState === "loading") && (
          <div className="h-full overflow-hidden py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-4 px-5 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-5 sm:px-7 md:px-8"
              >
                <div
                  className="bg-edge/10 mt-0.5 h-3.5 w-11 animate-pulse rounded-full"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
                <div className="space-y-2.5">
                  <div
                    className="bg-edge/10 h-3.5 animate-pulse rounded-full"
                    style={{ width: `${63 + ((i * 9) % 30)}%`, animationDelay: `${i * 80 + 40}ms` }}
                  />
                  <div
                    className="bg-edge/10 h-3.5 animate-pulse rounded-full"
                    style={{
                      width: `${38 + ((i * 13) % 45)}%`,
                      animationDelay: `${i * 80 + 80}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {loadState === "error" && (
          <div className="flex h-full flex-col items-start gap-4 px-5 py-8 sm:px-7 md:px-8">
            <p className="text-muted font-mono text-[11px] tracking-[0.15em] uppercase">
              {t("transcriptError")}
            </p>
            <button
              type="button"
              onClick={() => void loadTranscript()}
              className="border-edge text-muted hover:border-accent/40 hover:text-accent-text inline-flex min-h-9 items-center rounded-sm border px-4 py-2 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors"
            >
              {t("transcriptRetry")}
            </button>
          </div>
        )}

        {loadState === "ready" && (
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto overscroll-contain py-3"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "color-mix(in srgb, var(--edge) 35%, transparent) transparent",
            }}
          >
            {filteredSegments.length === 0 ? (
              <p className="text-muted px-5 py-10 text-center font-mono text-[11px] tracking-[0.15em] uppercase sm:px-7 md:px-8">
                {t("transcriptNoResults", { query: searchQuery })}
              </p>
            ) : (
              <ol>
                {filteredSegments.map((segment, index) => {
                  const realIndex = segments.indexOf(segment);
                  const isActive = realIndex === activeIndex;
                  return (
                    <li
                      key={`${segment.start}-${index}`}
                      ref={isActive ? activeRef : undefined}
                      className={`border-l-2 transition-colors duration-300 ${
                        isActive ? "border-l-accent" : "border-l-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSeek(segment.start)}
                        className={`group grid w-full grid-cols-[4rem_minmax(0,1fr)] items-baseline gap-4 px-5 py-3.5 text-left transition-colors duration-200 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-5 sm:px-7 sm:py-4 md:px-8 ${
                          isActive ? "bg-accent/[0.07]" : "hover:bg-surface/50"
                        }`}
                        aria-label={t("transcriptJumpToTime", { time: formatClock(segment.start) })}
                      >
                        <span
                          className={`pt-[0.22em] font-mono text-[11px] leading-none tracking-[0.06em] tabular-nums transition-colors duration-200 ${
                            isActive ? "text-accent-text" : "text-muted group-hover:text-secondary"
                          }`}
                        >
                          {formatClock(segment.start)}
                        </span>
                        <span
                          className={`block text-[14px] leading-[1.87] transition-colors duration-200 sm:text-[15px] ${
                            isActive ? "text-primary" : "text-muted/80 group-hover:text-primary"
                          }`}
                        >
                          {segment.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
