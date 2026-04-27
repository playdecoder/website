export const PODCAST_COVER_PATH = "/logo/square-podcast-cover.jpg";

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
