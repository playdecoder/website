"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useMemo, useState } from "react";

import {
  type Episode,
  episodeListenPathSegment,
  formatEpisodeDate,
  formatEpisodeDuration,
  getEpisodeArchiveFacets,
  getLatestEpisode,
} from "@/lib/episode-catalog";
import { EpisodeDescriptionRich, plainEpisodeDescription } from "@/lib/episode-description";
import { linkLocale } from "@/lib/link-locale";
import { listenEpisodePath } from "@/lib/routes";

import { IconEpisodeAirDate, IconEpisodeDuration } from "../ui/icons";

import { EpisodeLangCompactBadge } from "./episode-lang-compact-badge";

interface EpisodesArchiveClientProps {
  episodes: Episode[];
}

export function EpisodesArchiveClient({ episodes: allEpisodes }: EpisodesArchiveClientProps) {
  const locale = useLocale();
  const hrefLocale = linkLocale(locale);
  const t = useTranslations("episodesPage");
  const tSection = useTranslations("episodesSection");
  const { tags: facetTags, langs: facetLangs } = useMemo(
    () => getEpisodeArchiveFacets(allEpisodes),
    [allEpisodes],
  );
  const latestId = useMemo(() => getLatestEpisode(allEpisodes)?.id, [allEpisodes]);

  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<string | "all">("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const words = q ? q.split(/\s+/).filter(Boolean) : [];

    return allEpisodes.filter((ep) => {
      if (lang !== "all" && ep.lang !== lang) {
        return false;
      }

      if (selectedTags.size > 0) {
        const hasAny = [...selectedTags].some((tag) => ep.tags.includes(tag));
        if (!hasAny) {
          return false;
        }
      }

      if (words.length === 0) {
        return true;
      }

      const hay =
        `${ep.title} ${plainEpisodeDescription(ep.description)} ${ep.tags.join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [allEpisodes, query, lang, selectedTags]);

  const hasActiveFilters = query.trim() !== "" || lang !== "all" || selectedTags.size > 0;

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setLang("all");
    setSelectedTags(new Set());
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-24 md:pt-16 md:pb-32 lg:pt-20">
      <div className="scroll-reveal border-edge bg-surface/40 mb-12 space-y-8 rounded-sm border p-5 sm:p-7 md:mb-16 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="episodes-search"
              className="text-muted mb-2 block font-mono text-[10px] tracking-[0.25em] uppercase"
            >
              {t("searchLabel")}
            </label>
            <input
              id="episodes-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
              className="bg-bg border-edge text-primary placeholder:text-muted/50 focus:border-secondary/60 focus:ring-secondary/25 w-full rounded-sm border px-4 py-3 font-mono text-sm transition-colors focus:ring-1 focus:outline-none"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-secondary border-secondary/35 hover:bg-secondary/10 shrink-0 rounded-sm border px-4 py-3 font-mono text-xs tracking-widest uppercase transition-colors"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>

        <div>
          <span className="text-muted mb-3 block font-mono text-[10px] tracking-[0.25em] uppercase">
            {t("languageLabel")}
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("languageLabel")}>
            <button
              type="button"
              onClick={() => setLang("all")}
              className={`rounded-sm border px-3 py-2 font-mono text-xs tracking-widest uppercase transition-colors ${
                lang === "all"
                  ? "border-accent bg-accent/15 text-accent-text"
                  : "border-edge text-muted hover:border-primary/30 hover:text-primary"
              }`}
            >
              {t("languageAll")}
            </button>
            {facetLangs.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`rounded-sm border px-3 py-2 font-mono text-xs tracking-widest uppercase transition-colors ${
                  lang === code
                    ? "border-secondary bg-secondary/12 text-secondary"
                    : "border-edge text-muted hover:border-primary/30 hover:text-primary"
                }`}
              >
                {code === "cs" ? t("langCs") : code === "en" ? t("langEn") : code}
              </button>
            ))}
          </div>
        </div>

        {facetTags.length > 0 && (
          <div>
            <span className="text-muted mb-3 block font-mono text-[10px] tracking-[0.25em] uppercase">
              {t("topicsLabel")}
            </span>
            <div className="flex flex-wrap gap-2">
              {facetTags.map((tag) => {
                const on = selectedTags.has(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={on}
                    className={`rounded-sm border px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors ${
                      on
                        ? "border-secondary text-secondary bg-secondary/[0.08]"
                        : "border-edge/80 text-muted hover:border-secondary/40 hover:text-primary"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-muted font-mono text-xs tracking-wide" aria-live="polite">
          {filtered.length === 0
            ? t("resultsNone")
            : t("resultsMatches", { count: filtered.length, total: allEpisodes.length })}
        </p>
      </div>

      <ul className="m-0 grid list-none gap-6 p-0 md:gap-8 lg:grid-cols-2">
        {filtered.length === 0 && (
          <li className="border-edge bg-surface/30 col-span-full rounded-sm border px-8 py-16 text-center">
            <p className="font-display text-primary mb-3 text-xl">{t("emptyHeading")}</p>
            <p className="text-muted mx-auto mb-6 max-w-md leading-relaxed">{t("emptyHint")}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="cta-on-lime rounded-sm px-5 py-2.5 font-mono text-xs tracking-widest uppercase"
            >
              {t("clearFilters")}
            </button>
          </li>
        )}
        {filtered.map((ep, i) => (
          <li key={ep.id} className="scroll-reveal" style={{ animationDelay: `${0.04 * i}s` }}>
            <article className="border-edge bg-bg group hover:border-accent/35 relative flex h-full flex-col overflow-hidden rounded-sm border transition-colors duration-300">
              <div
                className={`absolute top-0 bottom-0 left-0 w-1 ${ep.id === latestId ? "bg-accent" : "bg-secondary"}`}
              />

              <div className="flex min-h-0 flex-1 flex-col py-7 pr-5 pl-7 sm:py-9 sm:pr-7 sm:pl-8">
                <div className="mb-5 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-accent-text font-mono text-sm font-medium tracking-widest">
                    {ep.id}
                  </span>
                  {ep.id === latestId && (
                    <span className="cta-on-lime rounded-sm px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-widest uppercase">
                      {tSection("latest")}
                    </span>
                  )}
                  <EpisodeLangCompactBadge lang={ep.lang} />
                  <div className="ml-auto flex flex-wrap justify-end gap-1.5">
                    {ep.tags.map((tag) => (
                      <span key={tag} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <h2
                  className="font-display text-primary group-hover:text-accent-text mb-4 leading-[1.15] font-bold transition-colors"
                  style={{ fontSize: "clamp(1.35rem, 2.8vw, 2rem)" }}
                >
                  <Link
                    href={listenEpisodePath(episodeListenPathSegment(ep))}
                    locale={hrefLocale}
                    className="focus-visible:outline-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {ep.title}
                  </Link>
                </h2>

                <p className="text-muted mb-8 line-clamp-4 flex-1 text-base leading-[1.75] md:text-[1.05rem]">
                  <EpisodeDescriptionRich text={ep.description} />
                </p>

                <div className="border-edge mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-5">
                  <span className="text-muted inline-flex items-center gap-2 font-mono text-xs tracking-widest">
                    <IconEpisodeAirDate size={13} className="text-secondary/65" />
                    {formatEpisodeDate(ep.date, locale)}
                  </span>
                  <span className="text-muted inline-flex items-center gap-2 font-mono text-xs tracking-widest">
                    <IconEpisodeDuration size={13} className="text-secondary/65" />
                    {formatEpisodeDuration(ep.duration)}
                  </span>
                  <Link
                    href={listenEpisodePath(episodeListenPathSegment(ep))}
                    locale={hrefLocale}
                    className="cta-on-lime ml-auto inline-flex items-center gap-2 rounded-sm px-5 py-2.5 font-mono text-xs font-medium tracking-widest uppercase transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
                  >
                    <svg width="11" height="13" viewBox="0 0 12 14" fill="currentColor" aria-hidden>
                      <path d="M0 0L12 7L0 14V0Z" />
                    </svg>
                    {tSection("playEpisode")}
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
