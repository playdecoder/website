import type { Episode } from "@/lib/episode-catalog";

import { absoluteFromPath } from "./site";

/** Raster fallback when `Episode.coverImage` is empty (generated from wide SVG). */
export const FALLBACK_EPISODE_COVER_PATH = "/logo/wide-fallback-og.png";

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

/** Absolute URL for episode art (OG, JSON-LD, RSS). */
export function resolveEpisodeCoverImageUrl(episode: Episode): string {
  const raw = episode.coverImage?.trim() ?? "";
  if (raw) {
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return absoluteFromPath(path);
  }
  return absoluteFromPath(FALLBACK_EPISODE_COVER_PATH);
}

/** Paths for Next `metadata` / `metadataBase` (relative when same-origin). */
export function resolveEpisodeCoverForMeta(episode: Episode): {
  url: string;
  absolute: string;
  type: string;
} {
  const raw = episode.coverImage?.trim() ?? "";
  if (raw && /^https?:\/\//i.test(raw)) {
    return {
      url: raw,
      absolute: raw,
      type: imageMimeFromPathOrUrl(raw),
    };
  }
  const path = raw ? (raw.startsWith("/") ? raw : `/${raw}`) : FALLBACK_EPISODE_COVER_PATH;
  return {
    url: path,
    absolute: absoluteFromPath(path),
    type: imageMimeFromPathOrUrl(path),
  };
}
