"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import { episodesArchiveSearchParams } from "@/lib/episode/archive-search-params";
import { type Episode, getEpisodeArchiveFacets, getLatestEpisode } from "@/lib/episode/catalog";
import { plainEpisodeDescription } from "@/lib/episode/description";
import { episodePublicationTitle } from "@/lib/episode/format";
import { linkLocale } from "@/lib/routing/link-locale";

import { EpisodeGridCard } from "./episode-grid-card";
import {
  EpisodesArchiveFiltersPanel,
  type EpisodesSearchScopes,
} from "./episodes-archive-filters-panel";

function episodeMatchesSearchQuery(
  ep: Episode,
  catalog: Episode[],
  words: string[],
  scopes: EpisodesSearchScopes,
): boolean {
  if (words.length === 0) {
    return true;
  }
  const parts: string[] = [];
  if (scopes.title) {
    parts.push(ep.title, episodePublicationTitle(ep), ...ep.tags);
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
  const tFormat = useTranslations("episodeFormat");
  const formatLabels = {
    spotlight: tFormat("spotlight"),
    flashback: tFormat("flashback"),
  } as const;
  const { tags: facetTags } = getEpisodeArchiveFacets(allEpisodes);
  const latestId = getLatestEpisode(allEpisodes)?.id;

  const [filters, setFilters] = useQueryStates(episodesArchiveSearchParams, { history: "replace" });

  const searchScopes: EpisodesSearchScopes = {
    title: filters.st,
    description: filters.sd,
    chapters: filters.sc,
  };

  const facetTagSet = new Set(facetTags);
  let selectedTags: Set<string>;
  if (topicFilterLocked) {
    selectedTags = new Set(initialSelectedTags);
  } else {
    const next = new Set<string>();
    for (const tag of filters.tags) {
      if (facetTagSet.has(tag)) {
        next.add(tag);
      }
    }
    selectedTags = next;
  }

  const archiveTotalForResults =
    !topicFilterLocked || initialSelectedTags.length === 0
      ? allEpisodes.length
      : allEpisodes.filter((ep) => initialSelectedTags.some((tag) => ep.tags.includes(tag))).length;

  const q = filters.q.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter(Boolean) : [];
  const filtered = allEpisodes.filter((ep) => {
    if (selectedTags.size > 0) {
      let hasAny = false;
      for (const tag of ep.tags) {
        if (selectedTags.has(tag)) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) {
        return false;
      }
    }

    return episodeMatchesSearchQuery(ep, allEpisodes, words, searchScopes);
  });

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
        tags: Array.from(set).toSorted((a, b) => a.localeCompare(b)),
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
            <EpisodeGridCard
              episode={ep}
              locale={locale}
              hrefLocale={hrefLocale}
              isLatest={ep.id === latestId}
              latestLabel={tSection("latest")}
              playLabel={tSection("playEpisode")}
              formatLabels={formatLabels}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
