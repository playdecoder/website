import type { Episode } from "@/lib/episode-catalog";
import {
  episodeListenPathSegment,
  formatEpisodeDate,
  formatEpisodeDuration,
} from "@/lib/episode-catalog";
import { EpisodeDescriptionRich } from "@/lib/episode-description";
import { listenEpisodePath } from "@/lib/routes";

import { Link } from "@/i18n/navigation";

import { IconEpisodeAirDate, IconEpisodeDuration } from "../ui/icons";

import { EpisodeCoverArt, episodeArtBannerFadeClassName } from "./episode-cover-art";
import { EpisodeLangCompactBadge } from "./episode-lang-compact-badge";
import { TopicLinkChip } from "./topic-link-chip";

interface EpisodeGridCardProps {
  episode: Episode;
  locale: string;
  hrefLocale: string | undefined;
  isLatest: boolean;
  latestLabel: string;
  playLabel: string;
  /** `sizes` hint for the art image. */
  artSizes?: string;
}

/** Grid card for `EpisodesArchiveClient`. String labels as props for client-tree use. */
export function EpisodeGridCard({
  episode: ep,
  locale,
  hrefLocale,
  isLatest,
  latestLabel,
  playLabel,
  artSizes = "(min-width: 1024px) 400px, (min-width: 640px) calc(50vw - 24px), calc(100vw - 40px)",
}: EpisodeGridCardProps) {
  const href = listenEpisodePath(episodeListenPathSegment(ep));
  const hasArt = Boolean(ep.artImage);

  return (
    <article className="border-edge bg-bg group hover:border-accent/35 active:border-secondary/45 relative flex h-full flex-col overflow-hidden rounded-sm border transition-colors duration-300">
      <div
        className={`absolute top-0 bottom-0 left-0 z-30 w-1 ${isLatest ? "bg-accent" : "bg-secondary"}`}
      />

      {isLatest && (
        <span className="cta-on-lime absolute top-3 right-3 z-30 rounded-sm px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-widest uppercase">
          {latestLabel}
        </span>
      )}

      {hasArt ? (
        <div className="relative h-40 sm:h-44">
          <Link href={href} locale={hrefLocale} className="absolute inset-0 block" tabIndex={-1} aria-hidden>
            <EpisodeCoverArt episode={ep} sizes={artSizes} className="absolute inset-0" />
          </Link>

          <div className={episodeArtBannerFadeClassName} />

          <div className="absolute inset-x-0 bottom-0 z-20 flex items-end gap-x-2 bg-gradient-to-t from-bg/90 via-bg/40 to-transparent pb-3 pl-7 pr-5 pt-16 dark:from-black/85 dark:via-black/55 sm:pl-8">
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-primary dark:text-accent-text font-mono text-sm font-medium tracking-widest dark:drop-shadow-sm">
                {ep.id}
              </span>
              <EpisodeLangCompactBadge lang={ep.lang} />
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-1 overflow-hidden">
              {ep.tags.map((tag, i) => (
                <TopicLinkChip
                  key={tag}
                  tag={tag}
                  locale={locale}
                  className={`${i >= 2 ? "hidden sm:inline-flex" : "inline-flex"} shrink-0 min-h-[28px] items-center rounded-[3px] border border-secondary/25 bg-secondary/10 px-[5px] py-0.5 font-mono text-[0.58rem] tracking-[0.08em] text-secondary transition-colors hover:border-secondary/45 hover:text-primary`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`flex flex-wrap items-center gap-2 pl-7 sm:gap-3 sm:pl-8 ${
            isLatest ? "pr-20 pt-9 sm:pr-20 sm:pt-10" : "pr-5 pt-7 sm:pr-7 sm:pt-9"
          }`}
        >
          <span className="text-accent-text font-mono text-sm font-medium tracking-widest">
            {ep.id}
          </span>
          <EpisodeLangCompactBadge lang={ep.lang} />
          <div className="ml-auto flex flex-wrap justify-end gap-1.5">
            {ep.tags.map((tag) => (
              <TopicLinkChip key={tag} tag={tag} locale={locale} />
            ))}
          </div>
        </div>
      )}

      <div
        className={`flex min-h-0 flex-1 flex-col pr-5 pl-7 sm:pr-7 sm:pl-8 ${hasArt ? "pt-4 pb-7 sm:pt-5 sm:pb-9" : "pt-5 pb-7 sm:pt-6 sm:pb-9"}`}
      >
        <h2
          className="font-display text-primary group-hover:text-accent-text mb-4 leading-[1.15] font-bold transition-colors"
          style={{ fontSize: "clamp(1.35rem, 2.8vw, 2rem)" }}
        >
          <Link
            href={href}
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
            href={href}
            locale={hrefLocale}
            className="cta-on-lime mt-1 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-sm px-5 py-3 font-mono text-xs font-medium tracking-widest uppercase transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] sm:ml-auto sm:w-auto sm:justify-start"
          >
            <svg width="11" height="13" viewBox="0 0 12 14" fill="currentColor" aria-hidden>
              <path d="M0 0L12 7L0 14V0Z" />
            </svg>
            {playLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
