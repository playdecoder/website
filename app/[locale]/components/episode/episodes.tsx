import { getTranslations } from "next-intl/server";
import Link from "next/link";

import {
  episodes,
  episodeListenPathSegment,
  formatEpisodeDate,
  formatEpisodeDuration,
  getLatestEpisode,
} from "@/lib/episode-catalog";
import { EpisodeDescriptionRich } from "@/lib/episode-description";
import { PAGE_SECTION_ID, ROUTES, listenEpisodePath } from "@/lib/routes";

import { IconEpisodeAirDate, IconEpisodeDuration } from "../ui/icons";
import { SectionHeading } from "../ui/section-heading";

import { EpisodeSpokenLangNote } from "./episode-spoken-lang-note";

export async function Episodes({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "episodesSection" });
  const latestEpisode = getLatestEpisode(episodes);
  if (!latestEpisode) {
    return null;
  }
  const archiveEpisodes = episodes.filter((e) => e.id !== latestEpisode.id);

  return (
    <section id={PAGE_SECTION_ID.episodes} className="border-edge relative border-t py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading variant="rail" label={t("label")} className="mb-16" />

        <div className="scroll-reveal mb-6">
          <div className="episode-feature-card border-edge group hover:border-accent/40 relative overflow-hidden rounded-sm border transition-colors duration-300">
            <div className="episode-feature-card__rail bg-accent absolute top-0 bottom-0 left-0 w-1" />

            <div className="py-8 pr-6 pl-8 md:py-10">
              <EpisodeSpokenLangNote
                lang={latestEpisode.lang}
                locale={locale}
                variant="banner"
                embedded
              />

              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="text-accent-text font-mono text-sm font-medium tracking-widest">
                  {latestEpisode.id}
                </span>
                <span className="cta-on-lime rounded-sm px-2.5 py-0.5 font-mono text-xs font-medium tracking-widest uppercase">
                  {t("latest")}
                </span>
                <div className="flex basis-full flex-wrap gap-1.5 md:ml-auto md:basis-auto md:justify-end">
                  {latestEpisode.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <h2
                className="font-display text-primary mb-4 leading-tight font-bold"
                style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)" }}
              >
                {latestEpisode.title}
              </h2>

              <p className="text-muted mb-8 max-w-2xl text-base leading-[1.8] md:text-lg">
                <EpisodeDescriptionRich text={latestEpisode.description} />
              </p>

              <div className="flex flex-wrap items-center gap-6">
                <span className="text-muted inline-flex shrink-0 items-center gap-2 font-mono text-xs tracking-widest whitespace-nowrap">
                  <IconEpisodeAirDate size={13} className="text-secondary/65" />
                  {formatEpisodeDate(latestEpisode.date, locale)}
                </span>
                <span className="text-muted inline-flex items-center gap-2 font-mono text-xs tracking-widest">
                  <IconEpisodeDuration size={13} className="text-secondary/65" />
                  {formatEpisodeDuration(latestEpisode.duration)}
                </span>
                <Link
                  href={listenEpisodePath(episodeListenPathSegment(latestEpisode))}
                  className="premium-cta cta-on-lime ml-auto flex items-center gap-2 rounded-sm px-5 py-2.5 font-mono text-xs font-medium tracking-widest uppercase transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
                >
                  <svg width="11" height="13" viewBox="0 0 12 14" fill="currentColor" aria-hidden>
                    <path d="M0 0L12 7L0 14V0Z" />
                  </svg>
                  {t("playEpisode")}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-reveal">
          {archiveEpisodes.map((ep, i) => (
            <Link
              key={ep.id}
              href={listenEpisodePath(episodeListenPathSegment(ep))}
              className="episode-row group border-edge hover:bg-surface/60 -mx-3 flex cursor-pointer flex-col gap-2 border-b px-3 py-5 transition-colors duration-200 sm:flex-row sm:items-center sm:gap-6"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-secondary w-10 shrink-0 font-mono text-xs font-medium tracking-widest">
                    {ep.id}
                  </span>
                  <EpisodeSpokenLangNote lang={ep.lang} locale={locale} variant="compact" />
                </div>
                <div className="text-muted flex shrink-0 items-center gap-2.5 font-mono text-xs tracking-widest">
                  <span className="tabular-nums">{formatEpisodeDuration(ep.duration)}</span>
                  <span className="episode-row__arrow text-muted/40 group-hover:text-accent-text/70 inline-flex transition-colors">
                    →
                  </span>
                </div>
              </div>

              <div className="hidden min-w-0 shrink-0 items-center gap-2 sm:flex">
                <span className="text-secondary w-10 font-mono text-xs font-medium tracking-widest">
                  {ep.id}
                </span>
                <EpisodeSpokenLangNote lang={ep.lang} locale={locale} variant="compact" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-display text-primary group-hover:text-accent-text text-base leading-snug font-semibold transition-colors sm:truncate md:text-lg">
                  {ep.title}
                </p>
              </div>

              <div className="hidden shrink-0 items-center gap-4 sm:flex">
                <div className="flex gap-1.5">
                  {ep.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-muted w-20 text-right font-mono text-xs tracking-widest">
                  {formatEpisodeDuration(ep.duration)}
                </span>
                <span className="text-muted hidden shrink-0 text-right font-mono text-xs tracking-widest whitespace-nowrap md:block">
                  {formatEpisodeDate(ep.date, locale)}
                </span>
                <span className="episode-row__arrow text-muted/30 group-hover:text-accent-text/70 transition-colors">
                  →
                </span>
              </div>
            </Link>
          ))}

          <div className="border-edge scroll-reveal mt-10 flex justify-center border-t pt-8">
            <Link
              href={ROUTES.episodes}
              className="premium-cta text-secondary border-secondary/35 hover:bg-secondary/10 rounded-sm border px-5 py-3 font-mono text-xs tracking-widest uppercase transition-colors"
            >
              {t("archiveLink")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
