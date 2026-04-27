import type { Episode } from "@/lib/episode-catalog";

import { absoluteFromPath, getPodcastCoverAbsoluteUrl, PODCAST_COVER_PATH } from "./site";

/** Same path as the RSS feed channel/episode art (`getPodcastCoverAbsoluteUrl`) */
export const FALLBACK_EPISODE_COVER_PATH = PODCAST_COVER_PATH;

function imageMimeFromPathOrUrl(pathOrUrl: string): string {
  const base = pathOrUrl.split("?")[0]?.toLowerCase() ?? "";
  if (base.endsWith(".png")) {
    return "image/png";
  }
  if (base.endsWith(".webp")) {
    return "image/webp";
  }
  if (base.endsWith(".gif")) {
    return "image/gif";
  }
  if (base.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return "image/jpeg";
}

export function resolveEpisodeCoverImageUrl(episode: Episode): string {
  const raw = episode.coverImage?.trim() ?? "";
  if (raw) {
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return absoluteFromPath(path);
  }
  return getPodcastCoverAbsoluteUrl();
}

/** Always-absolute image URL and MIME type for Open Graph and Twitter. */
export function resolveEpisodeCoverForMeta(episode: Episode): { url: string; type: string } {
  const raw = episode.coverImage?.trim() ?? "";
  if (raw && /^https?:\/\//i.test(raw)) {
    return { url: raw, type: imageMimeFromPathOrUrl(raw) };
  }
  const path = raw ? (raw.startsWith("/") ? raw : `/${raw}`) : PODCAST_COVER_PATH;
  return { url: absoluteFromPath(path), type: imageMimeFromPathOrUrl(path) };
}
