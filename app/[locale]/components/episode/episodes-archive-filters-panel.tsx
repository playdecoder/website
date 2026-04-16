"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

export interface EpisodesSearchScopes {
  title: boolean;
  description: boolean;
  chapters: boolean;
}

export interface EpisodesArchiveFiltersPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchScopes: EpisodesSearchScopes;
  onToggleSearchScope: (key: keyof EpisodesSearchScopes) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  topicFilterLocked: boolean;
  facetTags: readonly string[];
  selectedTags: ReadonlySet<string>;
  onToggleTag: (tag: string) => void;
  filteredCount: number;
  archiveTotalForResults: number;
}

function ScopeToggle({
  scopeKey,
  label,
  checked,
  onToggleSearchScope,
}: {
  scopeKey: keyof EpisodesSearchScopes;
  label: string;
  checked: boolean;
  onToggleSearchScope: (key: keyof EpisodesSearchScopes) => void;
}) {
  const inputId = `episodes-search-scope-${scopeKey}`;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "border-edge/80 flex min-h-[3rem] w-full cursor-pointer items-center gap-3 rounded-sm border bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] px-3.5 py-2.5 transition-[border-color,background-color,box-shadow] duration-200 sm:min-h-[2.75rem] sm:px-3",
        checked &&
          "border-secondary/50 bg-secondary/[0.08] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--secondary)_18%,transparent)] dark:bg-secondary/[0.12]",
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={() => onToggleSearchScope(scopeKey)}
        className="border-edge text-primary focus-visible:ring-secondary/40 size-[1.125rem] shrink-0 cursor-pointer rounded-sm border bg-bg accent-[var(--secondary)] focus-visible:ring-2 focus-visible:outline-none"
      />
      <span className="text-primary text-left font-mono text-[11px] leading-snug tracking-[0.12em] uppercase sm:text-[10px] sm:leading-tight sm:tracking-[0.14em]">
        {label}
      </span>
    </label>
  );
}

export function EpisodesArchiveFiltersPanel({
  query,
  onQueryChange,
  searchScopes,
  onToggleSearchScope,
  hasActiveFilters,
  onClearFilters,
  topicFilterLocked,
  facetTags,
  selectedTags,
  onToggleTag,
  filteredCount,
  archiveTotalForResults,
}: EpisodesArchiveFiltersPanelProps) {
  const t = useTranslations("episodesPage");
  const scopeFieldId = "episodes-search-scopes";

  return (
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
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            className="bg-bg border-edge text-primary placeholder:text-muted/50 focus:border-secondary/60 focus:ring-secondary/25 min-h-12 w-full rounded-sm border px-4 py-3 font-mono text-sm transition-colors focus:ring-1 focus:outline-none sm:min-h-0"
          />
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-secondary border-secondary/35 hover:bg-secondary/10 min-h-12 w-full rounded-sm border px-4 py-3 font-mono text-xs tracking-widest uppercase transition-colors sm:w-auto sm:min-h-0"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>

      <fieldset className="border-0 p-0">
        <div className="mb-3 flex min-w-0 items-center gap-3 sm:mb-3.5">
          <span className="ui-pulse-dot bg-accent h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
          <legend
            id={scopeFieldId}
            className="text-muted shrink-0 font-mono text-[10px] tracking-[0.22em] uppercase sm:tracking-[0.25em]"
          >
            {t("searchScopesLabel")}
          </legend>
          <span className="bg-edge/60 mt-px hidden h-px min-w-[2rem] flex-1 sm:block" aria-hidden />
        </div>
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5"
          role="group"
          aria-labelledby={scopeFieldId}
        >
          <ScopeToggle
            scopeKey="title"
            label={t("searchScopeTitle")}
            checked={searchScopes.title}
            onToggleSearchScope={onToggleSearchScope}
          />
          <ScopeToggle
            scopeKey="description"
            label={t("searchScopeDescription")}
            checked={searchScopes.description}
            onToggleSearchScope={onToggleSearchScope}
          />
          <ScopeToggle
            scopeKey="chapters"
            label={t("searchScopeChapters")}
            checked={searchScopes.chapters}
            onToggleSearchScope={onToggleSearchScope}
          />
        </div>
      </fieldset>

      {facetTags.length > 0 && !topicFilterLocked ? (
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
                  onClick={() => onToggleTag(tag)}
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
      ) : null}

      <p className="text-muted font-mono text-xs tracking-wide" aria-live="polite">
        {filteredCount === 0
          ? t("resultsNone")
          : t("resultsMatches", { count: filteredCount, total: archiveTotalForResults })}
      </p>
    </div>
  );
}
