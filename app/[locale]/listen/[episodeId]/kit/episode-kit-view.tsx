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
import {
  LISTEN_PLATFORMS,
  type ListenPlatform,
  listenEpisodePath,
  listenEpisodePlatformPath,
  ROUTES,
} from "@/lib/routing/routes";
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
import { EpisodeKitToc, type KitTocEntry } from "./episode-kit-toc";

interface EpisodeKitViewProps {
  episode: Episode;
  locale: string;
}

const SECTION_ID = { links: "links", texts: "texts", images: "images" } as const;

type Network = "instagram" | "facebook" | "linkedin" | "x" | "youtube";

/** No brand logos in the icon set, so networks get the site's brand-colour marker instead. */
const NETWORKS: Record<Network, { label: string; markerClass: string }> = {
  instagram: {
    label: "Instagram",
    markerClass: "bg-[linear-gradient(45deg,#f58529,#dd2a7b_55%,#8134af)]",
  },
  facebook: { label: "Facebook", markerClass: "bg-[#1877f2]" },
  linkedin: { label: "LinkedIn", markerClass: "bg-[#0a66c2]" },
  x: { label: "X", markerClass: "bg-primary" },
  youtube: { label: "YouTube", markerClass: "bg-[#ff0000]" },
};

/** Which network a social layout belongs to; a sub-type only where a network has several. */
const SOCIAL_LAYOUT_NETWORK: Record<string, { network: Network; subtype?: "story" | "post" }> = {
  "ig-story": { network: "instagram", subtype: "story" },
  "ig-post": { network: "instagram", subtype: "post" },
  "fb-story": { network: "facebook", subtype: "story" },
  "facebook-post": { network: "facebook", subtype: "post" },
  "linkedin-post": { network: "linkedin" },
  "x-post": { network: "x" },
  "youtube-keyart": { network: "youtube" },
};

function KitSection({
  id,
  heading,
  note,
  delay,
  children,
}: {
  id: string;
  heading: string;
  note?: string;
  delay: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-32 space-y-4 lg:scroll-mt-24"
      style={{ animation: `fadeUp 0.6s ease both ${delay}` }}
    >
      <div className="space-y-1">
        <h2
          id={`${id}-heading`}
          className="font-display text-primary text-lg font-bold tracking-tight sm:text-xl"
        >
          {heading}
        </h2>
        {note ? (
          <p className="text-muted max-w-prose font-mono text-[11px] leading-relaxed sm:text-xs">
            {note}
          </p>
        ) : null}
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
      platform: Object.fromEntries(
        LISTEN_PLATFORMS.map((platform) => [
          platform,
          absolute(listenEpisodePlatformPath(episodeListenSlugPrefix(episode), platform)),
        ]),
      ) as Record<ListenPlatform, string>,
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
    apple: "Apple Podcasts",
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
    "fb-story": tListen("reviewLayoutFbStory"),
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

  // One section per layout, clustered by network (Instagram → Story, Post), so the ToC can
  // jump straight to e.g. Facebook.
  const subtypeLabel = { story: t("subtypeStory"), post: t("subtypePost") };
  const socialLayoutIds = [...new Set(kit.social.map((asset) => asset.layoutId))];
  const sections: ReviewGallerySection[] = [
    ...socialLayoutIds.map((layoutId): ReviewGallerySection => {
      const placement = SOCIAL_LAYOUT_NETWORK[layoutId];
      const network = placement ? NETWORKS[placement.network] : undefined;
      return {
        key: layoutId,
        // Sub-type sections get their own anchor so the ToC can list Story / Post.
        id: placement?.subtype ? `${SECTION_ID.images}-${layoutId}` : undefined,
        group: "social",
        heading: placement?.subtype
          ? subtypeLabel[placement.subtype]
          : network
            ? ""
            : (layoutNames[layoutId] ?? layoutId),
        cluster: placement
          ? {
              key: placement.network,
              id: `${SECTION_ID.images}-${placement.network}`,
              label: NETWORKS[placement.network].label,
              markerClass: NETWORKS[placement.network].markerClass,
            }
          : undefined,
        items: kit.social.filter((asset) => asset.layoutId === layoutId).map(toItem),
      };
    }),
    {
      key: "covers",
      heading: "",
      cluster: {
        key: "covers",
        id: `${SECTION_ID.images}-covers`,
        label: tListen("reviewCoversLabel"),
      },
      items: kit.covers.map(toItem),
    },
    {
      key: "web",
      heading: "",
      cluster: { key: "keyart", id: `${SECTION_ID.images}-keyart`, label: t("keyArtLabel") },
      items: kit.web.map(toItem),
    },
  ].filter((section) => section.items.length > 0);

  // ToC: network → sub-type (Instagram → Story, Post), in gallery order.
  const tocImageEntries: KitTocEntry[] = [];
  for (const section of sections) {
    const cluster = section.cluster;
    if (!cluster?.id) continue;
    let network = tocImageEntries.find((entry) => entry.id === cluster.id);
    if (!network) {
      network = { id: cluster.id, label: cluster.label, children: [] };
      tocImageEntries.push(network);
    }
    if (section.id && section.heading) {
      network.children?.push({
        id: section.id,
        label: section.heading,
        chipLabel: `${cluster.label} ${section.heading}`,
      });
    }
  }

  const tocEntries: KitTocEntry[] = [
    { id: SECTION_ID.links, label: t("sectionLinks") },
    { id: SECTION_ID.texts, label: t("sectionTexts") },
    {
      id: SECTION_ID.images,
      label: t("sectionImages"),
      children: tocImageEntries,
    },
  ];
  const tocProps = { entries: tocEntries, heading: t("tocHeading"), ariaLabel: t("jumpAria") };

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
          className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-20 pb-16 sm:px-5 sm:pt-24 sm:pb-20 md:pt-28 md:pb-28"
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

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-14">
            <div className="min-w-0">
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
              </header>

              {/* Sticky wrapper lives in the long content column so the bar follows the whole page. */}
              <div className="sticky top-16 z-20 mt-8 lg:hidden">
                <EpisodeKitToc variant="bar" {...tocProps} />
              </div>

              <div className="mt-10 space-y-14 sm:mt-12 sm:space-y-16 lg:mt-14">
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
                        directUrl={link.directUrl}
                        note={link.pending ? t("linkPending") : undefined}
                        copyAria={t("copyLinkAria", { label: linkLabel[link.key] })}
                        copyDirectAria={t("copyDirectAria", { label: linkLabel[link.key] })}
                        openAria={t("openAria", { label: linkLabel[link.key] })}
                        openDirectAria={t("openDirectAria", { label: linkLabel[link.key] })}
                        openLabel={t("open")}
                        labels={copyLabels}
                      />
                    ))}
                  </ul>
                </KitSection>

                <KitSection id={SECTION_ID.texts} heading={t("sectionTexts")} delay="0.14s">
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

                <KitSection id={SECTION_ID.images} heading={t("sectionImages")} delay="0.18s">
                  <div className="space-y-8">
                    <EpisodeReviewGallery
                      sections={sections}
                      openFullLabel={tListen("reviewOpenFull")}
                      lightboxLabels={lightboxLabels}
                      kit={{
                        download: t("download"),
                        downloadFailed: t("downloadFailed"),
                        goToTemplate: tListen("reviewLightboxGoTo", { n: "{n}" }),
                        groupEmptyNotes: { social: t("socialEmpty") },
                      }}
                    />
                  </div>
                </KitSection>
              </div>
            </div>

            <aside className="hidden lg:block">
              <EpisodeKitToc variant="rail" {...tocProps} />
            </aside>
          </div>
        </div>
      </DecoderPageFrame>
    </div>
  );
}
