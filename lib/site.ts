export const PODCAST_COVER_PATH = "/podcast-cover.jpg";

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
