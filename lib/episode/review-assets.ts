import type { Episode } from "@/lib/episode/catalog";
import {
  resolveEpisodeCoverImageUrl,
  resolveEpisodeCoverImageUrlForRss,
  resolveEpisodeCoverVariantUrl,
} from "@/lib/episode/cover";
import { PODCAST_COVER_SIZE, socialFrameCdnUrl, type SocialFrameTheme } from "@/lib/site/urls";

/** rss: podcast feed artwork · page: episode page and share previews · web: site UI only. */
export type ReviewAssetUse = "rss" | "page" | "web";

export interface ReviewAsset {
  key: string;
  /** Layout id as the generator names it (`ig-post`), `cover` for RSS artwork, `keyart` for site art. */
  layoutId: string;
  /** Null for art that has no light/dark variant. */
  theme: SocialFrameTheme | null;
  url: string;
  width: number;
  height: number;
  /** Where this exact file is consumed; empty for social frames (posted by hand). */
  usedFor: ReviewAssetUse[];
}

export interface EpisodeReviewAssets {
  covers: ReviewAsset[];
  social: ReviewAsset[];
  web: ReviewAsset[];
}

/** Key art from `prepare-spotlight-keyart.mjs` is 16:9; used when the file can't be measured. */
const KEYART_FALLBACK_SIZE = { width: 1920, height: 1080 } as const;

/**
 * Sample of social layouts shown on the review page. Mirrors `scripts/lib/social-layouts.mjs`;
 * the full set is deliberately not shown, just enough to sanity-check art crop and copy.
 */
const SOCIAL_SAMPLE: ReadonlyArray<{
  layoutId: string;
  theme: SocialFrameTheme;
  width: number;
  height: number;
}> = [
  // Order matters for the review grid: the two-row story packs beside two stacked squares.
  { layoutId: "ig-story", theme: "dark", width: 1080, height: 1920 },
  { layoutId: "ig-post", theme: "dark", width: 1080, height: 1080 },
  { layoutId: "ig-post", theme: "light", width: 1080, height: 1080 },
  { layoutId: "youtube-keyart", theme: "dark", width: 1920, height: 1080 },
  { layoutId: "linkedin-post", theme: "light", width: 1200, height: 627 },
];

const COVER_SIZE = PODCAST_COVER_SIZE;

/**
 * @param keyArtSize Measured size of `episode.artImage` (see `readPublicImageSize`); the
 *   repo-versioned key art behind the player, cards and home banner. Not in the feed.
 */
export function buildEpisodeReviewAssets(
  episode: Episode,
  keyArtSize: { width: number; height: number } | null = null,
): EpisodeReviewAssets {
  const rssUrl = resolveEpisodeCoverImageUrlForRss(episode);
  const pageUrl = resolveEpisodeCoverImageUrl(episode);

  const covers: ReviewAsset[] = [];
  for (const theme of ["dark", "light"] as const) {
    const url = resolveEpisodeCoverVariantUrl(episode, theme);
    if (!url) {
      continue;
    }
    const usedFor: ReviewAssetUse[] = [];
    if (url === rssUrl) {
      usedFor.push("rss");
    }
    if (url === pageUrl) {
      usedFor.push("page");
    }
    covers.push({
      key: `cover-${theme}`,
      layoutId: "cover",
      theme,
      url,
      width: COVER_SIZE.width,
      height: COVER_SIZE.height,
      usedFor,
    });
  }

  // No per-episode cover declared: the feed and page fall back to the series cover.
  if (covers.length === 0) {
    covers.push({
      key: "cover-fallback",
      layoutId: "cover",
      theme: "dark",
      url: rssUrl,
      width: COVER_SIZE.width,
      height: COVER_SIZE.height,
      usedFor: ["rss", "page"],
    });
  }

  const social = SOCIAL_SAMPLE.map<ReviewAsset>((sample) => ({
    key: `${sample.layoutId}-${sample.theme}`,
    layoutId: sample.layoutId,
    theme: sample.theme,
    url: socialFrameCdnUrl(episode.id, sample.layoutId, sample.theme),
    width: sample.width,
    height: sample.height,
    usedFor: [],
  }));

  const web: ReviewAsset[] = episode.artImage
    ? [
        {
          key: "keyart",
          layoutId: "keyart",
          theme: null,
          url: episode.artImage,
          ...(keyArtSize ?? KEYART_FALLBACK_SIZE),
          usedFor: ["web"],
        },
      ]
    : [];

  return { covers, social, web };
}
