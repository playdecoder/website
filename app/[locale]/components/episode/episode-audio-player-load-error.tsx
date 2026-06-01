"use client";

import { useTranslations } from "next-intl";

export function EpisodeAudioPlayerLoadError() {
  const t = useTranslations("listen");

  return (
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-95">
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
  );
}
