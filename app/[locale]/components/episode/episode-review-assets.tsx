import { getTranslations } from "next-intl/server";
import type React from "react";

import type { Episode } from "@/lib/episode/catalog";
import { buildEpisodeReviewAssets, type ReviewAsset } from "@/lib/episode/review-assets";
import { readPublicImageSize } from "@/lib/episode/review-keyart";

import {
  EpisodeReviewGallery,
  type ReviewGallerySection,
  type ReviewGalleryItem,
} from "./episode-review-gallery";
import type { LightboxLabels } from "./episode-review-lightbox";

export const REVIEW_ASSETS_SECTION_ID = "review-assets";

/** Accent pill with a live dot; shared by the unreleased note and the gallery header. */
export function ReviewPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-review/10 text-review border-review/30 inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
      <span className="bg-review ui-pulse-dot size-1.5 rounded-full" aria-hidden />
      {children}
    </span>
  );
}

interface EpisodeReviewAssetsProps {
  episode: Episode;
  locale: string;
}

/**
 * Review-only gallery for unreleased episodes: the covers the feed emits, a sample of social
 * frames, and the site key art.
 */
export async function EpisodeReviewAssets({ episode, locale }: EpisodeReviewAssetsProps) {
  const t = await getTranslations({ locale, namespace: "listen" });
  const { covers, social, web } = buildEpisodeReviewAssets(
    episode,
    await readPublicImageSize(episode.artImage),
  );
  const layoutNames: Record<string, string> = {
    cover: t("reviewLayoutCover"),
    keyart: t("reviewLayoutKeyart"),
    "ig-post": t("reviewLayoutIgPost"),
    "ig-story": t("reviewLayoutIgStory"),
    "facebook-post": t("reviewLayoutFacebookPost"),
    "linkedin-post": t("reviewLayoutLinkedinPost"),
    "youtube-keyart": t("reviewLayoutYoutubeKeyart"),
    "x-post": t("reviewLayoutXPost"),
  };

  const usedForLabel: Record<ReviewAsset["usedFor"][number], string> = {
    rss: t("reviewUsedRss"),
    page: t("reviewUsedPage"),
    web: t("reviewUsedWeb"),
  };

  // Lightbox navigation runs across all groups, so numbering is global.
  const toItem = (asset: ReviewAsset, globalIndex: number): ReviewGalleryItem => {
    const layoutLabel = layoutNames[asset.layoutId] ?? asset.layoutId;
    const themeLabel =
      asset.theme === null
        ? null
        : asset.theme === "dark"
          ? t("reviewThemeDark")
          : t("reviewThemeLight");
    return {
      key: asset.key,
      url: asset.url,
      width: asset.width,
      height: asset.height,
      theme: asset.theme,
      kind: asset.layoutId === "cover" ? "cover" : asset.layoutId === "keyart" ? "web" : "social",
      layoutLabel,
      themeLabel,
      usedForLabels: asset.usedFor.map((use) => usedForLabel[use]),
      alt: themeLabel
        ? t("reviewAssetAlt", { episodeId: episode.id, layout: layoutLabel, theme: themeLabel })
        : `${episode.id} – ${layoutLabel}`,
      goToLabel: t("reviewLightboxGoTo", { n: globalIndex + 1 }),
    };
  };

  const sections: ReviewGallerySection[] = [
    {
      key: "covers",
      heading: t("reviewCoversLabel"),
      items: covers.map((asset, i) => toItem(asset, i)),
    },
    {
      key: "social",
      heading: t("reviewSocialLabel"),
      items: social.map((asset, i) => toItem(asset, covers.length + i)),
    },
    {
      key: "web",
      heading: t("reviewWebLabel"),
      items: web.map((asset, i) => toItem(asset, covers.length + social.length + i)),
    },
  ].filter((section) => section.items.length > 0);

  const lightboxLabels: LightboxLabels = {
    dialog: t("reviewLightboxDialog"),
    close: t("reviewLightboxClose"),
    prev: t("reviewLightboxPrev"),
    next: t("reviewLightboxNext"),
    openOriginal: t("reviewLightboxOpenOriginal"),
    zoomIn: t("reviewLightboxZoomIn"),
    resetZoom: t("reviewLightboxResetZoom"),
    hintTouch: t("reviewLightboxHintTouch"),
    hintPointer: t("reviewLightboxHintPointer"),
    specs: t("specsHeading"),
  };
  const headingId = `${REVIEW_ASSETS_SECTION_ID}-heading`;

  return (
    <section
      id={REVIEW_ASSETS_SECTION_ID}
      aria-labelledby={headingId}
      className="review-surface review-surface--halo text-primary scroll-mt-24 space-y-7 rounded-sm px-4 py-4 sm:px-5 sm:py-5"
      style={{ animation: "fadeUp 0.62s ease both 0.16s" }}
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ReviewPill>{t("unreleasedLabel")}</ReviewPill>
          <h2
            id={headingId}
            className="font-display text-primary text-base font-bold tracking-tight sm:text-lg"
          >
            {t("reviewAssetsHeading")}
          </h2>
        </div>
        <p className="text-muted max-w-prose font-mono text-[11px] leading-snug sm:text-xs">
          {t("reviewAssetsIntro")}
        </p>
      </div>
      <EpisodeReviewGallery
        sections={sections}
        openFullLabel={t("reviewOpenFull")}
        lightboxLabels={lightboxLabels}
      />
    </section>
  );
}
