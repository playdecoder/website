import { getTranslations } from "next-intl/server";
import type React from "react";

import { getPathname, Link } from "@/i18n/navigation";
import {
  type Episode,
  type EpisodeHost,
  barColorCss,
  episodes,
  episodeLayoutSeed,
  episodeListenPathSegment,
  formatEpisodeDate,
  formatEpisodeDuration,
  formatEpisodeDurationIso8601,
  getEpisodeNeighbors,
  getLatestEpisode,
  parseEpisodeIsoDate,
  listenBackgroundBarsForEpisode,
} from "@/lib/episode-catalog";
import { resolveEpisodeCoverImageUrl } from "@/lib/episode-cover";
import { plainEpisodeDescription } from "@/lib/episode-description";
import { BRAND_NAME } from "@/lib/brand";
import { linkLocale } from "@/lib/link-locale";
import { listenEpisodePath, ROUTES, homeSectionPath } from "@/lib/routes";
import { showHostsSchemaPersons } from "@/lib/show";
import { absoluteFromPath, getPodcastCoverAbsoluteUrl, getPublicSiteUrl } from "@/lib/site";

import { EpisodeListenPlayerAndBody } from "../../components/episode/episode-listen-player-body";
import { EpisodeNeighborNav } from "../../components/episode/episode-neighbor-nav";
import { EpisodeShareButton } from "../../components/episode/episode-share-button";
import { EpisodeSpokenLangNote } from "../../components/episode/episode-spoken-lang-note";
import { Navbar } from "../../components/layout/navbar";
import { DecoderPageFrame } from "../../components/layout/page-frame";
import { BarMotif } from "../../components/ui/bar-motif";
import {
  IconEpisodeAirDate,
  IconEpisodeDuration,
  IconExternalLink,
  IconLatestDrop,
} from "../../components/ui/icons";

interface EpisodeListenViewProps {
  episode: Episode;
  locale: string;
}

function episodeAirDateSpine(isoDate: string, locale: string): string {
  const d = parseEpisodeIsoDate(isoDate);
  if (!d) {
    return isoDate.replaceAll("-", "·");
  }
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short" })
    .format(d)
    .replace(/\./g, "")
    .trim()
    .toLocaleUpperCase(locale);
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}·${monthShort}·${year}`;
}

function LatestDropBadge({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={`cta-on-lime inline-flex w-fit items-center gap-2 rounded-sm px-3 py-1.5 font-mono text-[10px] font-medium tracking-widest uppercase md:text-xs${className ? ` ${className}` : ""}`}
    >
      <IconLatestDrop
        size={15}
        className="[animation:latestDropPing_1.8s_ease-in-out_infinite] opacity-95"
      />
      {label}
    </div>
  );
}

function hostInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function isHttpUrl(link: string): boolean {
  try {
    const u = new URL(link);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function trimEpisodeHosts(episode: Episode): EpisodeHost[] {
  if (!episode.hosts?.length) {
    return [];
  }
  return episode.hosts
    .map((h) => ({
      fullName: h.fullName?.trim() ?? "",
      link: h.link?.trim() ?? "",
    }))
    .filter((h) => h.fullName && h.link);
}

function listenWaveDuration(dur: string): string {
  const n = parseFloat(dur);
  if (!Number.isFinite(n)) {
    return "3.8s";
  }
  const scaled = n * 2.4;
  return `${Math.min(5.4, Math.max(2.9, scaled)).toFixed(2)}s`;
}

function EpisodeListenHosts({
  hosts,
  heading,
  profileAria,
  stagger,
}: {
  hosts: EpisodeHost[];
  heading: string;
  profileAria: (name: string) => string;
  stagger: (i: number) => string;
}) {
  if (hosts.length === 0) {
    return null;
  }

  return (
    <section
      className="border-edge/20 from-surface-2/40 text-primary rounded-sm border bg-gradient-to-br to-transparent px-3 py-2.5 sm:px-3.5 sm:py-3"
      style={{ animation: "fadeUp 0.62s ease both 0.12s" }}
      aria-label={heading}
    >
      <h2 className="text-muted mb-2 font-mono text-[9px] tracking-[0.22em] uppercase sm:text-[10px] sm:tracking-[0.26em]">
        {heading}
      </h2>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2.5" role="list">
        {hosts.map((host, i) => {
          const hrefOk = isHttpUrl(host.link);
          const delay = stagger(i + 2);
          return (
            <li
              key={`${host.fullName}-${host.link}`}
              className="min-w-0 sm:max-w-xs"
              style={{ animation: `fadeUp 0.55s ease both ${delay}` }}
            >
              <div className="border-edge/30 bg-surface/60 hover:border-accent-text/35 group flex min-h-10 items-center gap-2 rounded-sm border px-2 py-1.5 transition-[border-color,background-color] duration-200 sm:min-h-9 sm:py-1.5">
                <span
                  className="font-display text-accent-text bg-surface-2/80 border-edge/40 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border text-[10px] font-bold leading-none tracking-tight"
                  aria-hidden
                >
                  {hostInitials(host.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  {hrefOk ? (
                    <a
                      href={host.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display text-primary group-hover:text-accent-text inline-flex min-h-10 w-full items-center gap-1 text-sm font-semibold tracking-tight transition-colors sm:min-h-9"
                      aria-label={profileAria(host.fullName)}
                    >
                      <span className="truncate">{host.fullName}</span>
                      <IconExternalLink
                        size={12}
                        className="text-secondary/55 group-hover:text-accent-text shrink-0 transition-colors"
                      />
                    </a>
                  ) : (
                    <span className="font-display text-primary block truncate text-sm font-semibold tracking-tight">
                      {host.fullName}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EpisodeListenTags({ tags, stagger }: { tags: string[]; stagger: (i: number) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {tags.map((tag, i) => (
        <span key={tag} className="tag-pill" style={{ animationDelay: stagger(i) }}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function EpisodeListenMetadata({
  episode,
  locale,
  shareLabel,
  shareAria,
}: {
  episode: Episode;
  locale: string;
  shareLabel: string;
  shareAria: string;
}) {
  return (
    <div
      className="text-muted flex flex-col gap-1.5 font-mono text-[11px] tracking-widest min-[380px]:flex-row min-[380px]:flex-wrap min-[380px]:items-center min-[380px]:gap-x-5 sm:gap-x-8 sm:text-xs"
      style={{ animation: "fadeUp 0.6s ease both 0.14s" }}
    >
      <span className="inline-flex items-center gap-2 break-words">
        <IconEpisodeAirDate size={13} className="text-secondary/65" />
        {formatEpisodeDate(episode.date, locale)}
      </span>
      <span className="text-edge hidden min-[380px]:inline" aria-hidden>
        ·
      </span>
      <span className="inline-flex items-center gap-2">
        <IconEpisodeDuration size={13} className="text-secondary/65" />
        {formatEpisodeDuration(episode.duration)}
      </span>
      <EpisodeShareButton
        shareTitle={`${episode.id} — ${episode.title}`}
        shareText={episode.description}
        label={shareLabel}
        labelAria={shareAria}
        className="min-[380px]:ml-auto"
      />
    </div>
  );
}

export async function EpisodeListenView({ episode, locale }: EpisodeListenViewProps) {
  const t = await getTranslations({ locale, namespace: "listen" });
  const hrefLocale = linkLocale(locale);
  const descriptionPlain = plainEpisodeDescription(episode.description);
  const segment = episodeListenPathSegment(episode);
  const canonicalUrl = absoluteFromPath(getPathname({ locale, href: listenEpisodePath(segment) }));
  const episodeCoverUrl = resolveEpisodeCoverImageUrl(episode);
  const seriesCoverUrl = getPodcastCoverAbsoluteUrl();
  const seriesUrl = `${getPublicSiteUrl()}/`;
  const displayHosts = trimEpisodeHosts(episode);
  const episodeContributors = displayHosts
    .filter((h) => isHttpUrl(h.link))
    .map((h) => ({
      "@type": "Person" as const,
      name: h.fullName,
      url: h.link,
    }));
  const episodeJsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    "@id": `${canonicalUrl}#episode`,
    url: canonicalUrl,
    name: `${episode.id} — ${episode.title}`,
    headline: episode.title,
    description: descriptionPlain,
    datePublished: episode.date,
    duration: formatEpisodeDurationIso8601(episode.duration),
    inLanguage: episode.lang,
    image: episodeCoverUrl,
    author: showHostsSchemaPersons(),
    ...(episodeContributors.length > 0 ? { contributor: episodeContributors } : {}),
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: episode.links.mp3,
      encodingFormat: "audio/mpeg",
    },
    partOfSeries: {
      "@type": "PodcastSeries",
      name: BRAND_NAME,
      url: seriesUrl,
      image: seriesCoverUrl,
    },
  };
  const seed = episodeLayoutSeed(episode.id);
  const { older, newer } = getEpisodeNeighbors(episode);
  const isLatest = getLatestEpisode(episodes)?.id === episode.id;
  const bars = listenBackgroundBarsForEpisode(episode.id);
  const accentIsLeft = seed % 2 === 0;
  const bloomX = 12 + (seed % 55);
  const bloomY = 10 + ((seed >>> 8) % 60);
  const bloom2X = 85 - (seed % 40);
  const bloom2Y = 75 - ((seed >>> 16) % 35);
  const stagger = (i: number) => `${0.04 * i + (seed % 7) * 0.01}s`;

  return (
    <div className="page-shell">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(episodeJsonLd)}
      </script>
      <Navbar locale={locale} />

      <DecoderPageFrame className="min-h-0" scanPeriodSec={16} scanOpacity={0.22}>
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0 opacity-90 dark:opacity-100"
            style={{
              background: [
                `radial-gradient(ellipse 80% 55% at ${bloomX}% ${bloomY}%, color-mix(in srgb, var(--secondary) 11%, transparent), transparent 58%)`,
                `radial-gradient(ellipse 70% 50% at ${bloom2X}% ${bloom2Y}%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 52%)`,
              ].join(", "),
            }}
          />
        </div>

        <div
          className="listen-page-wave-layer pointer-events-none fixed inset-0 z-[1] flex items-end overflow-hidden select-none"
          aria-hidden
        >
          <div className="flex h-full min-h-0 w-full items-end gap-px px-0.5 opacity-[0.085] sm:gap-0.5 sm:px-2 dark:opacity-[0.055]">
            {bars.map((bar, i) => (
              <div
                key={`bg-${episode.id}-${i}`}
                className="waveform-bar waveform-bar--listen-bg max-w-[3.5vw] min-w-0"
                data-motion={String(bar.motion)}
                style={
                  {
                    flex: `${bar.flexGrow} 1 0`,
                    height: `max(6px, min(22rem, ${(bar.h / 200) * 58}vh))`,
                    background: barColorCss[bar.color],
                    "--duration": bar.dur,
                    "--delay": bar.delay,
                    "--listen-wave-dur": listenWaveDuration(bar.dur),
                    "--listen-ease": bar.ease,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-start justify-center overflow-hidden pt-20 select-none sm:pt-24 md:pt-28"
          aria-hidden
        >
          <span
            className="font-display text-edge/[0.12] dark:text-edge/[0.065] max-w-[100vw] px-2 leading-none font-extrabold tracking-tighter whitespace-nowrap"
            style={{
              fontSize: "clamp(2.75rem, 18vw, 16rem)",
              transform: `translateX(clamp(-4%, ${(seed % 5) - 2}%, 4%)) rotate(${(seed % 3) - 1}deg)`,
            }}
          >
            {episode.id}
          </span>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-20 pb-16 sm:px-5 sm:pt-24 sm:pb-20 md:pt-28 md:pb-28">
          <nav
            className="text-muted mb-5 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[10px] tracking-[0.12em] uppercase sm:mb-10 sm:tracking-[0.2em] md:mb-14 md:text-xs"
            style={{ animation: "fadeUp 0.55s ease both" }}
            aria-label={t("breadcrumbAria")}
          >
            <Link
              href={ROUTES.home}
              locale={hrefLocale}
              className="hover-underline hover:text-primary -my-1.5 inline-flex min-h-11 items-center py-1.5 transition-colors"
            >
              {BRAND_NAME}
            </Link>
            <span className="text-edge">/</span>
            <Link
              href={ROUTES.episodes}
              locale={hrefLocale}
              className="hover-underline hover:text-primary -my-1.5 inline-flex min-h-11 items-center py-1.5 transition-colors"
            >
              {t("breadcrumbEpisodes")}
            </Link>
            <span className="text-edge">/</span>
            <span className="text-accent-text">{episode.id}</span>
          </nav>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-14">
            <div
              className="hidden lg:col-span-4 lg:flex lg:flex-col lg:gap-8"
              style={{ animation: "fadeUp 0.65s ease both 0.05s" }}
            >
              <div className="flex items-center gap-3 sm:gap-4 lg:flex-col lg:items-start lg:gap-4">
                <BarMotif size={1} />
                <div className="flex flex-col gap-3">
                  <span className="text-muted font-mono text-xs tracking-[0.25em] uppercase">
                    {t("onTheWire")}
                  </span>
                  <div className="flex flex-col items-start gap-3">
                    <span
                      className="text-secondary font-mono text-sm font-medium tracking-[0.35em] md:text-base"
                      style={{ animation: "fadeUp 0.6s ease both 0.12s" }}
                    >
                      {episode.id}
                    </span>
                    {isLatest ? (
                      <LatestDropBadge
                        label={t("latestDrop")}
                        className="[animation:fadeUp_0.6s_ease_both_0.18s]"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                className="text-edge/25 dark:text-edge/[0.12] hidden font-mono leading-[0.85] font-bold tracking-tight select-none lg:flex"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontSize: "clamp(3rem, 8vw, 6.5rem)",
                  animation: "fadeUp 0.75s ease both 0.15s",
                }}
                aria-hidden
              >
                {episodeAirDateSpine(episode.date, locale)}
              </div>
            </div>

            <div className="space-y-6 lg:col-span-8 lg:space-y-10">
              <div
                className="flex items-center justify-between gap-3 lg:hidden"
                style={{ animation: "fadeUp 0.65s ease both 0.05s" }}
              >
                <div className="flex items-center gap-3">
                  <BarMotif size={1} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted font-mono text-[10px] tracking-[0.25em] uppercase">
                      {t("onTheWire")}
                    </span>
                    <span className="text-secondary font-mono text-sm font-medium tracking-[0.35em]">
                      {episode.id}
                    </span>
                  </div>
                </div>
                {isLatest ? <LatestDropBadge label={t("latestDrop")} /> : null}
              </div>

              <div className="hidden lg:block lg:space-y-6">
                <EpisodeSpokenLangNote lang={episode.lang} locale={locale} variant="banner" />
                <div style={{ animation: "fadeUp 0.6s ease both 0.08s" }}>
                  <EpisodeListenTags tags={episode.tags} stagger={stagger} />
                </div>
              </div>

              <h1
                className="font-display text-primary leading-[1.08] font-bold tracking-tight text-balance sm:leading-[1.05]"
                style={{
                  fontSize: "clamp(1.5rem, 6.5vw, 3.25rem)",
                  animation: "fadeUp 0.65s ease both 0.1s",
                }}
              >
                {episode.title}
              </h1>

              {displayHosts.length > 0 ? (
                <EpisodeListenHosts
                  hosts={displayHosts}
                  heading={t("episodeHostsHeading")}
                  profileAria={(name) => t("episodeHostProfileAria", { name })}
                  stagger={stagger}
                />
              ) : null}

              <div className="hidden lg:block">
                <EpisodeListenMetadata
                  episode={episode}
                  locale={locale}
                  shareLabel={t("shareEpisode")}
                  shareAria={t("shareEpisodeAria")}
                />
              </div>

              <EpisodeListenPlayerAndBody
                episode={episode}
                accentIsLeft={accentIsLeft}
                transcriptUrl={episode.links.transcript}
                afterPlayerSlot={
                  <div
                    className="border-edge/25 flex flex-col gap-4 border-t border-b py-2 lg:hidden"
                    style={{ animation: "fadeUp 0.5s ease both 0.1s" }}
                  >
                    <EpisodeSpokenLangNote
                      lang={episode.lang}
                      locale={locale}
                      variant="banner"
                      embedded
                      className="mb-0"
                    />
                    <EpisodeListenTags tags={episode.tags} stagger={stagger} />
                    <EpisodeListenMetadata
                      episode={episode}
                      locale={locale}
                      shareLabel={t("shareEpisode")}
                      shareAria={t("shareEpisodeAria")}
                    />
                  </div>
                }
              />

              <EpisodeNeighborNav
                locale={hrefLocale}
                newer={newer}
                older={older}
                labels={{
                  newer: t("newer"),
                  older: t("older"),
                  newestEpisodeStub: t("newestEpisodeStub"),
                  debutEpisodeStub: t("debutEpisodeStub"),
                }}
              />

              <div
                className="flex flex-col flex-wrap gap-3 pt-4 min-[420px]:flex-row"
                style={{ animation: "fadeUp 0.6s ease both 0.32s" }}
              >
                <Link
                  href={ROUTES.episodes}
                  locale={hrefLocale}
                  className="premium-cta cta-on-lime inline-flex min-h-11 w-full items-center justify-center rounded-sm px-6 py-3 font-mono text-xs font-medium tracking-widest uppercase transition-all duration-200 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] min-[420px]:w-auto"
                >
                  {t("allEpisodes")}
                </Link>
                <Link
                  href={homeSectionPath("contact")}
                  locale={hrefLocale}
                  className="border-edge text-muted hover:border-primary/40 hover:text-primary active:bg-surface-2 inline-flex min-h-11 w-full items-center justify-center rounded-sm border px-6 py-3 font-mono text-xs tracking-widest uppercase transition-all duration-200 min-[420px]:w-auto"
                >
                  {t("getInTouch")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DecoderPageFrame>
    </div>
  );
}
