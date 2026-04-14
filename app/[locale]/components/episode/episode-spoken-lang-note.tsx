import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/cn";

import { EpisodeLangCompactBadge } from "./episode-lang-compact-badge";

interface EpisodeSpokenLangNoteProps {
  lang: string;
  locale: string;
  variant: "banner" | "compact";
  embedded?: boolean;
  className?: string;
}

export async function EpisodeSpokenLangNote({
  lang,
  locale,
  variant,
  embedded,
  className,
}: EpisodeSpokenLangNoteProps) {
  if (lang !== "cs") {
    return null;
  }

  if (locale === "cs") {
    return null;
  }

  if (variant === "compact") {
    return <EpisodeLangCompactBadge lang={lang} />;
  }

  const t = await getTranslations({ locale, namespace: "episodeLanguage" });

  return (
    <div
      role="note"
      className={cn(
        "border-secondary/50 flex items-center gap-2.5 border-l-2 pl-3",
        embedded ? "mb-4" : "mb-5 sm:mb-6 md:mb-7",
        className,
      )}
    >
      <span className="bg-secondary/10 text-secondary border-secondary/25 shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.16em] uppercase">
        CZ
      </span>
      <span className="text-muted font-mono text-[11px] leading-none tracking-wide sm:text-xs">
        {t("banner")}
      </span>
    </div>
  );
}
