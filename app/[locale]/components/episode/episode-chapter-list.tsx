"use client";

import { useTranslations } from "next-intl";

import type { EpisodeChapter } from "@/lib/episode-catalog";
import { formatPlaybackTime } from "@/lib/format-playback-time";

interface EpisodeChapterListProps {
  chapters: EpisodeChapter[];
  currentTime: number;
  audioReady: boolean;
  onSeek: (seconds: number, chapter: EpisodeChapter) => void;
  /** When false, the “wait for load” hint is hidden (e.g. another episode is playing). */
  showLoadHint?: boolean;
}

export function EpisodeChapterList({
  chapters,
  currentTime,
  audioReady,
  onSeek,
  showLoadHint = true,
}: EpisodeChapterListProps) {
  const t = useTranslations("listen");
  const activeIdx = chapters.reduce((acc, ch, i) => (ch.t <= currentTime + 0.25 ? i : acc), -1);

  return (
    <div className="space-y-3">
      <ol className="m-0 grid list-none gap-1 p-0 sm:gap-1.5">
        {chapters.map((ch, i) => {
          const isActive = i === activeIdx;
          return (
            <li key={`${ch.t}-${ch.label}`}>
              <button
                type="button"
                disabled={!audioReady}
                onClick={() => onSeek(ch.t, ch)}
                className={`flex w-full items-baseline gap-3 rounded-sm border border-transparent px-2 py-1.5 text-left font-mono text-[11px] transition-colors sm:gap-4 sm:px-2.5 sm:py-2 sm:text-xs ${
                  isActive
                    ? "bg-secondary/10 text-primary border-secondary/25"
                    : "text-muted hover:text-primary hover:bg-surface-2/80 hover:border-edge"
                } disabled:pointer-events-none disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent`}
                aria-label={t("chapterJumpAria", {
                  time: formatPlaybackTime(ch.t),
                  label: ch.label,
                })}
              >
                <span className="text-secondary/90 w-[2.75rem] shrink-0 text-[10px] tracking-wider tabular-nums sm:w-12 sm:text-[11px]">
                  {formatPlaybackTime(ch.t)}
                </span>
                <span className={`min-w-0 leading-snug ${isActive ? "text-primary" : ""}`}>
                  {ch.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {!audioReady && showLoadHint ? (
        <p className="text-muted/70 font-mono text-[10px] tracking-wide">
          {t("chaptersWaitForLoad")}
        </p>
      ) : null}
    </div>
  );
}
