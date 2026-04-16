"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useMemo } from "react";

import { Link } from "@/i18n/navigation";
import {
  type Episode,
  episodeListenPathSegment,
  formatEpisodeDate,
  formatEpisodeDuration,
  getEpisodeArchiveFacets,
  getLatestEpisode,
} from "@/lib/episode-catalog";
import { EpisodeDescriptionRich, plainEpisodeDescription } from "@/lib/episode-description";
import { episodesArchiveSearchParams } from "@/lib/episodes-archive-search-params";
import { linkLocale } from "@/lib/link-locale";
import { listenEpisodePath } from "@/lib/routes";

import { IconEpisodeAirDate, IconEpisodeDuration } from "../ui/icons";

import { EpisodeLangCompactBadge } from "./episode-lang-compact-badge";
import {
  EpisodesArchiveFiltersPanel,
  type EpisodesSearchScopes,
} from "./episodes-archive-filters-panel";
import { TopicLinkChip } from "./topic-link-chip";

function episodeMatchesSearchQuery(
  ep: Episode,
  words: string[],
  scopes: EpisodesSearchScopes,
): boolean {
  if (words.length === 0) {
    return true;
  }
  const parts: string[] = [];
  if (scopes.title) {
    parts.push(ep.title, ...ep.tags);
  }
  if (scopes.description) {
    parts.push(plainEpisodeDescription(ep.description));
  }
  if (scopes.chapters && ep.chapters?.length) {
    for (const ch of ep.chapters) {
      parts.push(ch.label);
    }
  }
  const hay = parts.join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}

const EMPTY_SELECTED_TAGS: string[] = [];

interface EpisodesArchiveClientProps {
  episodes: Episode[];
  initialSelectedTags?: string[];
  topicFilterLocked?: boolean;
}

export function EpisodesArchiveClient({
  episodes: allEpisodes,
  initialSelectedTags = EMPTY_SELECTED_TAGS,
  topicFilterLocked = false,
}: EpisodesArchiveClientProps) {
  const locale = useLocale();
  const hrefLocale = linkLocale(locale);
  const t = useTranslations("episodesPage");
  const tSection = useTranslations("episodesSection");
  const { tags: facetTags } = useMemo(() => getEpisodeArchiveFacets(allEpisodes), [allEpisodes]);
  const latestId = useMemo(() => getLatestEpisode(allEpisodes)?.id, [allEpisodes]);

  const [filters, setFilters] = useQueryStates(episodesArchiveSearchParams, { history: "replace" });

  const searchScopes = useMemo<EpisodesSearchScopes>(
    () => ({
      title: filters.st,
      description: filters.sd,
      chapters: filters.sc,
    }),
    [filters.st, filters.sd, filters.sc],
  );

  const facetTagSet = useMemo(() => new Set(facetTags), [facetTags]);
  const selectedTags = useMemo(() => {
    if (topicFilterLocked) {
      return new Set(initialSelectedTags);
    }
    const next = new Set<string>();
    for (const tag of filters.tags) {
      if (facetTagSet.has(tag)) {
        next.add(tag);
      }
    }
    return next;
  }, [topicFilterLocked, initialSelectedTags, filters.tags, facetTagSet]);

  const archiveTotalForResults = useMemo(() => {
    if (!topicFilterLocked || initialSelectedTags.length === 0) {
      return allEpisodes.length;
    }
    return allEpisodes.filter((ep) => initialSelectedTags.some((tag) => ep.tags.includes(tag)))
      .length;
  }, [topicFilterLocked, initialSelectedTags, allEpisodes]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const words = q ? q.split(/\s+/).filter(Boolean) : [];

    return allEpisodes.filter((ep) => {
      if (selectedTags.size > 0) {
        let hasAny = false;
        for (const tag of selectedTags) {
          if (ep.tags.includes(tag)) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) {
          return false;
        }
      }

      return episodeMatchesSearchQuery(ep, words, searchScopes);
    });
  }, [allEpisodes, filters.q, selectedTags, searchScopes]);

  const searchScopesDefault = filters.st && filters.sd && filters.sc;

  const hasActiveFilters =
    filters.q.trim() !== "" ||
    (!topicFilterLocked && selectedTags.size > 0) ||
    !searchScopesDefault;

  function toggleTag(tag: string) {
    if (topicFilterLocked) {
      return;
    }
    void setFilters((prev) => {
      const set = new Set(prev.tags);
      if (set.has(tag)) {
        set.delete(tag);
      } else {
        set.add(tag);
      }
      return {
        tags: [...set].sort((a, b) => a.localeCompare(b)),
      };
    });
  }

  function toggleSearchScope(key: keyof EpisodesSearchScopes) {
    const st = key === "title" ? !filters.st : filters.st;
    const sd = key === "description" ? !filters.sd : filters.sd;
    const sc = key === "chapters" ? !filters.sc : filters.sc;
    if (!st && !sd && !sc) {
      return;
    }
    void setFilters({ st, sd, sc });
  }

  function clearFilters() {
    void setFilters({
      q: "",
      st: true,
      sd: true,
      sc: true,
      tags: [],
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-24 md:pt-16 md:pb-32 lg:pt-20">
      <EpisodesArchiveFiltersPanel
        query={filters.q}
        onQueryChange={(value) => void setFilters({ q: value })}
        searchScopes={searchScopes}
        onToggleSearchScope={toggleSearchScope}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        topicFilterLocked={topicFilterLocked}
        facetTags={facetTags}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        filteredCount={filtered.length}
        archiveTotalForResults={archiveTotalForResults}
      />

      <ul className="m-0 grid list-none gap-6 p-0 md:gap-8 lg:grid-cols-2">
        {filtered.length === 0 && (
          <li className="border-edge bg-surface/30 col-span-full rounded-sm border px-8 py-16 text-center">
            <p className="font-display text-primary mb-3 text-xl">{t("emptyHeading")}</p>
            <p className="font-body text-muted mx-auto mb-6 max-w-md leading-relaxed">
              {t(topicFilterLocked ? "emptyHintTopicLocked" : "emptyHint")}
            </p>
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
            <article className="border-edge bg-bg group hover:border-accent/35 active:border-secondary/45 relative flex h-full flex-col overflow-hidden rounded-sm border transition-colors duration-300">
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
                      <TopicLinkChip key={tag} tag={tag} locale={locale} />
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

                <p className="font-body text-muted mb-8 line-clamp-4 flex-1 text-base leading-[1.75] md:text-[1.05rem]">
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
