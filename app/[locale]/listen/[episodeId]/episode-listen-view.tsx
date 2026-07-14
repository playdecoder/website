import { getTranslations } from "next-intl/server";

import { getPathname, Link } from "@/i18n/navigation";
import {
  type Episode,
  episodes,
  episodeLayoutSeed,
  episodeListenPathSegment,
  getEpisodeNeighbors,
  getLatestEpisode,
} from "@/lib/episode/catalog";
import { resolveEpisodeCoverImageUrl } from "@/lib/episode/cover";
import { getEpisodeFormat, composeFormattedEpisodeTitle, episodeDisplayTags } from "@/lib/episode/format";
import { linkLocale } from "@/lib/routing/link-locale";
import { listenEpisodePath, ROUTES, homeSectionPath } from "@/lib/routing/routes";
import { BRAND_NAME } from "@/lib/site/brand";
import { absoluteFromPath, getPodcastCoverAbsoluteUrl, getPublicSiteUrl } from "@/lib/site/urls";

import { EpisodeListenPlayerAndBody } from "../../components/episode/episode-listen-player-body";
import { EpisodeNeighborNav } from "../../components/episode/episode-neighbor-nav";
import { EpisodePlayerArtBackground } from "../../components/episode/episode-player-art-background";
import { EpisodeSpokenLangNote } from "../../components/episode/episode-spoken-lang-note";
import { Navbar } from "../../components/layout/navbar";
import { DecoderPageFrame } from "../../components/layout/page-frame";

import { EpisodeListenDecorations } from "./episode-listen-decorations";
import { trimEpisodeHosts } from "./episode-listen-helpers";
import { buildEpisodeListenJsonLd } from "./episode-listen-json-ld";
import {
  EpisodeListenDesktopSidebar,
  EpisodeListenHosts,
  EpisodeListenMetadata,
  EpisodeListenMobileHeader,
  EpisodeListenTags,
  type EpisodeListenMetaLabels,
} from "./episode-listen-parts";

interface EpisodeListenViewProps {
  episode: Episode;
  locale: string;
}

export async function EpisodeListenView({ episode, locale }: EpisodeListenViewProps) {
  const t = await getTranslations({ locale, namespace: "listen" });
  const tFormat = await getTranslations({ locale, namespace: "episodeFormat" });
  const hrefLocale = linkLocale(locale);
  const segment = episodeListenPathSegment(episode);
  const episodeFormat = getEpisodeFormat(episode);
  const publicationTitle = composeFormattedEpisodeTitle(
    episode,
    episodeFormat ? tFormat(episodeFormat) : undefined,
  );
  const canonicalUrl = absoluteFromPath(getPathname({ locale, href: listenEpisodePath(segment) }));
  const episodeCoverUrl = resolveEpisodeCoverImageUrl(episode);
  const seriesCoverUrl = getPodcastCoverAbsoluteUrl();
  const seriesUrl = `${getPublicSiteUrl()}/`;
  const episodeJsonLd = buildEpisodeListenJsonLd(
    episode,
    canonicalUrl,
    episodeCoverUrl,
    seriesCoverUrl,
    seriesUrl,
  );
  const seed = episodeLayoutSeed(episode.id);
  const { older, newer } = getEpisodeNeighbors(episode);
  const isLatest = getLatestEpisode(episodes)?.id === episode.id;
  const accentIsLeft = seed % 2 === 0;
  const bloomX = 12 + (seed % 55);
  const bloomY = 10 + ((seed >>> 8) % 60);
  const bloom2X = 85 - (seed % 40);
  const bloom2Y = 75 - ((seed >>> 16) % 35);
  const stagger = (i: number) => `${0.04 * i + (seed % 7) * 0.01}s`;
  const displayHosts = trimEpisodeHosts(episode);
  const displayTags = episodeDisplayTags(episode);
  const episodeListenMetaLabels: EpisodeListenMetaLabels = {
    shareLabel: t("shareEpisode"),
    shareAria: t("shareEpisodeAria"),
    copyLabel: t("playerCopyLink"),
    copyLabelCompact: t("copyEpisodeLinkShort"),
    copyAria: t("playerCopyLinkAria"),
    copiedLabel: t("playerCopied"),
    copyFailedLabel: t("playerCopyFailed"),
  };

  return (
    <div className="page-shell">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(episodeJsonLd)}
      </script>
      <Navbar locale={locale} />

      <DecoderPageFrame className="min-h-0" scanPeriodSec={16} scanOpacity={0.22}>
        <EpisodeListenDecorations
          episode={episode}
          seed={seed}
          bloomX={bloomX}
          bloomY={bloomY}
          bloom2X={bloom2X}
          bloom2Y={bloom2Y}
        />

        <div
          className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-20 pb-16 sm:px-5 sm:pt-24 sm:pb-20 md:pt-28 md:pb-28"
          data-episode-format={episodeFormat ?? undefined}
        >
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
            <EpisodeListenDesktopSidebar
              episode={episode}
              locale={locale}
              isLatest={isLatest}
              onTheWireLabel={t("onTheWire")}
              latestDropLabel={t("latestDrop")}
            />

            <div className="space-y-6 lg:col-span-8 lg:space-y-10">
              <EpisodeListenMobileHeader
                episode={episode}
                isLatest={isLatest}
                onTheWireLabel={t("onTheWire")}
                latestDropLabel={t("latestDrop")}
              />

              <div className="hidden lg:block lg:space-y-6">
                <EpisodeSpokenLangNote lang={episode.lang} locale={locale} variant="banner" />
                <div style={{ animation: "fadeUp 0.6s ease both 0.08s" }}>
                  <EpisodeListenTags tags={displayTags} locale={locale} stagger={stagger} />
                </div>
              </div>

              <h1
                className="font-display text-primary leading-[1.08] font-bold tracking-tight text-balance sm:leading-[1.05]"
                style={{
                  fontSize: "clamp(1.5rem, 6.5vw, 3.25rem)",
                  animation: "fadeUp 0.65s ease both 0.1s",
                }}
              >
                {publicationTitle}
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
                  {...episodeListenMetaLabels}
                />
              </div>

              <EpisodeListenPlayerAndBody
                episode={episode}
                accentIsLeft={accentIsLeft}
                transcriptUrl={episode.links.transcript}
                artBackground={
                  <EpisodePlayerArtBackground
                    artImage={episode.artImage}
                    artFocalPoint={episode.artFocalPoint}
                    fade="gradient"
                    priority
                  />
                }
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
                    <EpisodeListenTags tags={displayTags} locale={locale} stagger={stagger} />
                    <EpisodeListenMetadata
                      episode={episode}
                      locale={locale}
                      {...episodeListenMetaLabels}
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
