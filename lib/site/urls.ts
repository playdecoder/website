const PODCAST_COVER_PATH = "/logo/square-podcast-cover.jpg";

/** Rasters from `generate-fallback-episode-cover.mjs` (must match the script’s width/height). */
export const PODCAST_COVER_SIZE = { width: 1400, height: 1400 } as const;

export function getPublicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dekoder.fm").replace(/\/$/, "");
}

export function absoluteFromPath(pathname: string): string {
  const base = getPublicSiteUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

export function getPodcastCoverAbsoluteUrl(): string {
  return absoluteFromPath(PODCAST_COVER_PATH);
}

/** Origin the podcast assets (audio, covers, social frames) are uploaded to by hand. */
export const PODCAST_CDN_ORIGIN = "https://cdn.play-decoder.com";

export type SocialFrameTheme = "dark" | "light";

/**
 * Social frames rendered by `scripts/generate-social-post.mjs` land in the gitignored
 * `output/<ep>/social/<layout>-<theme>.png`; upload that folder to
 * `${PODCAST_CDN_ORIGIN}/podcast/posts/<ep>/` for the review gallery to pick them up.
 */
export function socialFrameCdnUrl(episodeId: string, layoutId: string, theme: SocialFrameTheme) {
  return `${PODCAST_CDN_ORIGIN}/podcast/posts/${episodeId.toLowerCase()}/${layoutId}-${theme}.png`;
}
