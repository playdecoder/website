"use client";

import { useLocale, useTranslations } from "next-intl";

export function EpisodeLangCompactBadge({ lang }: { lang: string }) {
  const locale = useLocale();
  const t = useTranslations("episodeLanguage");
  if (lang !== "cs" || locale === "cs") {
    return null;
  }
  return (
    <span
      className="text-secondary border-secondary/40 bg-secondary/[0.06] inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase sm:text-[10px]"
      title={t("banner")}
    >
      <span
        className="bg-secondary h-1 w-1 shrink-0 rounded-full"
        style={{ animation: "pulseDot 2s ease-in-out infinite" }}
      />
      {t("compact")}
    </span>
  );
}
