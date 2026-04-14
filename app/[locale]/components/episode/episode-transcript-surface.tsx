import type { RefObject } from "react";

import type { TranscriptSegment } from "@/lib/fetch-episode-transcript";

type LoadState = "idle" | "loading" | "ready" | "error";

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface EpisodeTranscriptSurfaceProps {
  loadState: LoadState;
  segments: TranscriptSegment[];
  filteredSegments: TranscriptSegment[];
  searchQuery: string;
  activeIndex: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  activeRef: RefObject<HTMLLIElement | null>;
  onSeek: (seconds: number) => void;
  onRetry: () => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export function EpisodeTranscriptSurface({
  loadState,
  segments,
  filteredSegments,
  searchQuery,
  activeIndex,
  scrollRef,
  activeRef,
  onSeek,
  onRetry,
  t,
}: EpisodeTranscriptSurfaceProps) {
  return (
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
            onClick={() => void onRetry()}
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
                    key={
                      realIndex >= 0 ? `${realIndex}-${segment.start}` : `${segment.start}-${index}`
                    }
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
  );
}
