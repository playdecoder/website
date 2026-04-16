import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  episodeListenPathSegment,
  formatEpisodeDate,
  formatEpisodeDuration,
} from "@/lib/episode-catalog";
import { getCuratedPicks, hasCuratedPicks } from "@/lib/curated-picks";
import { linkLocale } from "@/lib/link-locale";
import { listenEpisodePath } from "@/lib/routes";

import { SectionHeading } from "../ui/section-heading";
import { TopicLinkChip } from "../episode/topic-link-chip";

const curatedCardTone = {
  founders: {
    borderClass: "hover:border-edge",
    audienceClass: "text-muted",
    episodeClass: "text-muted",
    glow: "radial-gradient(circle at top right, color-mix(in srgb, #c9823a 3.5%, transparent), transparent 54%)",
    dot: "#c9823a",
  },
  designers: {
    borderClass: "hover:border-edge",
    audienceClass: "text-muted",
    episodeClass: "text-muted",
    glow: "radial-gradient(circle at top right, color-mix(in srgb, #5c7df0 3.5%, transparent), transparent 54%)",
    dot: "#5c7df0",
  },
  builders: {
    borderClass: "hover:border-edge",
    audienceClass: "text-muted",
    episodeClass: "text-muted",
    glow: "radial-gradient(circle at top right, color-mix(in srgb, #76b36c 3.5%, transparent), transparent 54%)",
    dot: "#76b36c",
  },
} as const;

export async function StartHere({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "startHere" });
  const hrefLocale = linkLocale(locale);
  const picks = hasCuratedPicks() ? getCuratedPicks() : [];

  if (picks.length === 0) {
    return null;
  }

  return (
    <section className="border-edge relative border-t py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading variant="rail" label={t("label")} className="mb-10" />

        <div className="mb-10 max-w-2xl">
          <h2
            className="font-display text-primary mb-4 leading-[1.05] font-bold"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
          >
            {t("heading")}
          </h2>
          <p className="font-body text-muted text-base leading-relaxed md:text-lg">{t("intro")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {picks.map(({ key, episode }, index) => (
            (() => {
              const tone = curatedCardTone[key];

              return (
                <article
                  key={key}
                  className={`border-edge bg-surface/35 scroll-reveal group relative flex h-full flex-col overflow-hidden rounded-sm border p-6 transition-colors duration-300 active:border-secondary/40 ${tone.borderClass}`}
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-55 transition-opacity duration-300 group-hover:opacity-70"
                    aria-hidden
                    style={{ background: tone.glow }}
                  />

                  <div className="relative mb-5 flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.24em] uppercase ${tone.audienceClass}`}>
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full opacity-70"
                        aria-hidden
                        style={{ background: tone.dot }}
                      />
                      {t(`cards.${key}.audience`)}
                    </span>
                    <span className={`font-mono text-xs tracking-widest ${tone.episodeClass}`}>
                      {episode.id}
                    </span>
                  </div>

                  <p className="text-primary relative mb-3 font-display text-xl leading-tight font-semibold">
                    {t(`cards.${key}.title`)}
                  </p>

                  <Link
                    href={listenEpisodePath(episodeListenPathSegment(episode))}
                    locale={hrefLocale}
                    className="font-display text-primary group-hover:text-accent-text relative mb-4 text-2xl leading-tight font-bold transition-colors"
                  >
                    {episode.title}
                  </Link>

                  <p className="font-body text-muted relative mb-6 flex-1 leading-relaxed">
                    {t(`cards.${key}.body`)}
                  </p>

                  <div className="relative mb-6 flex flex-wrap gap-2">
                    {episode.tags.map((tag) => (
                      <TopicLinkChip key={tag} tag={tag} locale={locale} />
                    ))}
                  </div>

                  <div className="text-muted relative mb-5 flex flex-wrap items-center gap-3 font-mono text-xs tracking-widest">
                    <span>{formatEpisodeDate(episode.date, locale)}</span>
                    <span aria-hidden>·</span>
                    <span>{formatEpisodeDuration(episode.duration)}</span>
                  </div>

                  <Link
                    href={listenEpisodePath(episodeListenPathSegment(episode))}
                    locale={hrefLocale}
                    className="premium-cta cta-on-lime relative inline-flex w-fit items-center gap-2 rounded-sm px-5 py-2.5 font-mono text-xs font-medium tracking-widest uppercase transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
                  >
                    <svg width="11" height="13" viewBox="0 0 12 14" fill="currentColor" aria-hidden>
                      <path d="M0 0L12 7L0 14V0Z" />
                    </svg>
                    {t("cta")}
                  </Link>
                </article>
              );
            })()
          ))}
        </div>
      </div>
    </section>
  );
}
