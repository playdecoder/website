import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { getPathname, Link } from "@/i18n/navigation";
import {
  type Episode,
  episodeListenPathSegment,
  episodeListenSlugPrefix,
  formatEpisodeDate,
  formatEpisodeDuration,
} from "@/lib/episode/catalog";
import { getEpisodeFormat } from "@/lib/episode/format";
import type { ReviewAsset } from "@/lib/episode/review-assets";
import { readPublicImageSize } from "@/lib/episode/review-keyart";
import {
  buildEpisodeShareKit,
  type ShareKitLinkKey,
  type ShareKitTextKey,
} from "@/lib/episode/share-kit";
import { linkLocale } from "@/lib/routing/link-locale";
import { listenEpisodePath, ROUTES } from "@/lib/routing/routes";
import { BRAND_NAME } from "@/lib/site/brand";
import { absoluteFromPath } from "@/lib/site/urls";

import {
  EpisodeReviewGallery,
  type ReviewGalleryItem,
  type ReviewGallerySection,
} from "../../../components/episode/episode-review-gallery";
import type { LightboxLabels } from "../../../components/episode/episode-review-lightbox";
import { Navbar } from "../../../components/layout/navbar";
import { DecoderPageFrame } from "../../../components/layout/page-frame";

import { KitCopyButton, KitLinkRow, type KitCopyLabels } from "./episode-kit-actions";

interface EpisodeKitViewProps {
  episode: Episode;
  locale: string;
}

const SECTION_ID = { links: "links", texts: "texts", images: "images" } as const;

function KitSection({
  id,
  heading,
  note,
  delay,
  children,
}: {
  id: string;
  heading: string;
  note: string;
  delay: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 space-y-4"
      style={{ animation: `fadeUp 0.6s ease both ${delay}` }}
    >
      <div className="space-y-1">
        <h2
          id={`${id}-heading`}
          className="font-display text-primary text-lg font-bold tracking-tight sm:text-xl"
        >
          {heading}
        </h2>
        <p className="text-muted max-w-prose font-mono text-[11px] leading-relaxed sm:text-xs">
          {note}
        </p>
      </div>
      {children}
    </section>
  );
}

export async function EpisodeKitView({ episode, locale }: EpisodeKitViewProps) {
  const t = await getTranslations({ locale, namespace: "kit" });
  const tListen = await getTranslations({ locale, namespace: "listen" });
  const hrefLocale = linkLocale(locale);
  const segment = episodeListenPathSegment(episode);
  const episodeFormat = getEpisodeFormat(episode);

  const absolute = (href: string) => absoluteFromPath(getPathname({ locale, href }));
  const kit = buildEpisodeShareKit(
    episode,
    {
      page: absolute(listenEpisodePath(segment)),
      short: absolute(listenEpisodePath(episodeListenSlugPrefix(episode))),
    },
    await readPublicImageSize(episode.artImage),
  );

  const copyLabels: KitCopyLabels = {
    copy: t("copy"),
    copied: t("copied"),
    copyFailed: t("copyFailed"),
  };

  const linkLabel: Record<ShareKitLinkKey, string> = {
    page: t("linkPage"),
    short: t("linkShort"),
    youtube: "YouTube",
    spotify: "Spotify",
    applePodcasts: "Apple Podcasts",
  };

  const textLabel: Record<ShareKitTextKey, string> = {
    post: t("textPost"),
    title: t("textTitle"),
    short: t("textShort"),
    long: t("textLong"),
  };

  const layoutNames: Record<string, string> = {
    cover: tListen("reviewLayoutCover"),
    keyart: tListen("reviewLayoutKeyart"),
    "ig-post": tListen("reviewLayoutIgPost"),
    "ig-story": tListen("reviewLayoutIgStory"),
    "facebook-post": tListen("reviewLayoutFacebookPost"),
    "linkedin-post": tListen("reviewLayoutLinkedinPost"),
    "youtube-keyart": tListen("reviewLayoutYoutubeKeyart"),
    "x-post": tListen("reviewLayoutXPost"),
  };

  const toItem = (asset: ReviewAsset): ReviewGalleryItem => {
    const layoutLabel = layoutNames[asset.layoutId] ?? asset.layoutId;
    const themeLabel =
      asset.theme === null
        ? null
        : asset.theme === "dark"
          ? tListen("reviewThemeDark")
          : tListen("reviewThemeLight");
    const ext = asset.url.split(".").pop()?.split("?")[0] ?? "png";
    return {
      key: asset.key,
      url: asset.url,
      width: asset.width,
      height: asset.height,
      theme: asset.theme,
      kind: asset.layoutId === "cover" ? "cover" : asset.layoutId === "keyart" ? "web" : "social",
      layoutLabel,
      themeLabel,
      usedForLabels: [],
      alt: themeLabel
        ? tListen("reviewAssetAlt", {
            episodeId: episode.id,
            layout: layoutLabel,
            theme: themeLabel,
          })
        : `${episode.id} – ${layoutLabel}`,
      goToLabel: "",
      downloadName: [episode.id.toLowerCase(), asset.layoutId, asset.theme]
        .filter(Boolean)
        .join("-")
        .concat(`.${ext}`),
    };
  };

  const sections: ReviewGallerySection[] = [
    {
      key: "social",
      heading: tListen("reviewSocialLabel"),
      items: kit.social.map(toItem),
      emptyNote: t("socialEmpty"),
    },
    { key: "covers", heading: tListen("reviewCoversLabel"), items: kit.covers.map(toItem) },
    { key: "web", heading: t("keyArtLabel"), items: kit.web.map(toItem) },
  ].filter((section) => section.items.length > 0);

  const lightboxLabels: LightboxLabels = {
    dialog: tListen("reviewLightboxDialog"),
    close: tListen("reviewLightboxClose"),
    prev: tListen("reviewLightboxPrev"),
    next: tListen("reviewLightboxNext"),
    openOriginal: tListen("reviewLightboxOpenOriginal"),
    zoomIn: tListen("reviewLightboxZoomIn"),
    resetZoom: tListen("reviewLightboxResetZoom"),
    hintTouch: tListen("reviewLightboxHintTouch"),
    hintPointer: tListen("reviewLightboxHintPointer"),
    specs: tListen("specsHeading"),
  };

  const guests = (episode.hosts ?? []).map((h) => h.fullName).filter(Boolean);
  const meta = [
    guests.join(", "),
    formatEpisodeDate(episode.date, locale),
    formatEpisodeDuration(episode.duration),
  ].filter(Boolean);

  return (
    <div className="page-shell">
      <Navbar locale={locale} />

      <DecoderPageFrame className="min-h-0" scanPeriodSec={16} scanOpacity={0.22}>
        <div
          className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-20 pb-16 sm:px-5 sm:pt-24 sm:pb-20 md:pt-28 md:pb-28"
          data-episode-format={episodeFormat ?? undefined}
        >
          <nav
            className="text-muted mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[10px] tracking-[0.12em] uppercase sm:mb-10 sm:tracking-[0.2em] md:text-xs"
            style={{ animation: "fadeUp 0.55s ease both" }}
            aria-label={tListen("breadcrumbAria")}
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
              href={listenEpisodePath(segment)}
              locale={hrefLocale}
              className="hover-underline hover:text-primary -my-1.5 inline-flex min-h-11 items-center py-1.5 transition-colors"
            >
              {episode.id}
            </Link>
            <span className="text-edge">/</span>
            <span className="text-accent-text">{t("breadcrumb")}</span>
          </nav>

          <header className="space-y-4" style={{ animation: "fadeUp 0.6s ease both 0.06s" }}>
            <p className="flex flex-wrap items-center gap-3">
              <span className="episode-player-id-pill font-mono text-[11px] tracking-widest">
                {episode.id}
              </span>
              <span className="text-muted font-mono text-[11px] tracking-[0.14em] uppercase">
                {t("eyebrow")}
              </span>
            </p>
            <h1
              className="font-display text-primary leading-[1.08] font-bold tracking-tight text-balance"
              style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)" }}
            >
              {episode.title}
            </h1>
            <p className="text-muted font-mono text-[11px] tracking-wide sm:text-xs">
              {meta.join(" · ")}
            </p>
            <p className="text-primary/80 font-body max-w-prose text-[15px] leading-relaxed">
              {t("intro")}
            </p>
            {episode.unreleased ? (
              <p
                role="note"
                className="review-surface text-primary rounded-sm px-4 py-3 font-mono text-[11px] leading-relaxed sm:text-xs"
              >
                {t("unreleasedNote")}
              </p>
            ) : null}
            <nav aria-label={t("jumpAria")} className="flex flex-wrap gap-2 pt-1">
              {(
                [
                  [SECTION_ID.links, t("sectionLinks")],
                  [SECTION_ID.texts, t("sectionTexts")],
                  [SECTION_ID.images, t("sectionImages")],
                ] as const
              ).map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="border-edge text-muted hover:border-accent hover:text-primary inline-flex min-h-10 items-center rounded-sm border px-3 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>
          </header>

          <div className="mt-12 space-y-14 sm:mt-14 sm:space-y-16">
            <KitSection
              id={SECTION_ID.links}
              heading={t("sectionLinks")}
              note={t("sectionLinksNote")}
              delay="0.1s"
            >
              <ul className="border-edge bg-surface/85 dark:bg-surface/55 divide-edge/60 divide-y overflow-hidden rounded-sm border backdrop-blur-sm">
                {kit.links.map((link) => (
                  <KitLinkRow
                    key={link.key}
                    label={linkLabel[link.key]}
                    url={link.url}
                    copyAria={t("copyLinkAria", { label: linkLabel[link.key] })}
                    openLabel={t("open")}
                    openAria={t("openAria", { label: linkLabel[link.key] })}
                    labels={copyLabels}
                  />
                ))}
              </ul>
            </KitSection>

            <KitSection
              id={SECTION_ID.texts}
              heading={t("sectionTexts")}
              note={t("sectionTextsNote")}
              delay="0.14s"
            >
              <ul className="space-y-3">
                {kit.texts.map((text) => (
                  <li
                    key={text.key}
                    className={`bg-surface/85 dark:bg-surface/55 rounded-sm border backdrop-blur-sm ${
                      text.key === "post" ? "border-accent/70" : "border-edge"
                    }`}
                  >
                    <div className="border-edge/60 flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 sm:px-5">
                      <h3 className="text-primary font-mono text-[11px] font-medium tracking-[0.12em] whitespace-nowrap uppercase">
                        {textLabel[text.key]}
                      </h3>
                      <span className="text-muted font-mono text-[10px] tabular-nums">
                        {t("chars", { count: text.text.length })}
                      </span>
                      <KitCopyButton
                        text={text.text}
                        aria={t("copyTextAria", { label: textLabel[text.key] })}
                        labels={copyLabels}
                        className="ml-auto"
                      />
                    </div>
                    <p
                      className={`text-primary px-4 py-4 whitespace-pre-line sm:px-5 ${
                        text.key === "title"
                          ? "font-display text-base font-semibold tracking-tight"
                          : "font-body text-[15px] leading-relaxed"
                      }`}
                      lang={episode.lang}
                    >
                      {text.text}
                    </p>
                  </li>
                ))}
              </ul>
            </KitSection>

            <KitSection
              id={SECTION_ID.images}
              heading={t("sectionImages")}
              note={t("sectionImagesNote")}
              delay="0.18s"
            >
              <div className="space-y-8">
                <EpisodeReviewGallery
                  sections={sections}
                  openFullLabel={tListen("reviewOpenFull")}
                  lightboxLabels={lightboxLabels}
                  kit={{
                    download: t("download"),
                    downloadFailed: t("downloadFailed"),
                    goToTemplate: tListen("reviewLightboxGoTo", { n: "{n}" }),
                  }}
                />
              </div>
            </KitSection>
          </div>
        </div>
      </DecoderPageFrame>
    </div>
  );
}
