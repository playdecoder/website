import type { Episode, EpisodeCoverImage, EpisodeCoverVariant } from "@/lib/episode/catalog";

import { absoluteFromPath, getPodcastCoverAbsoluteUrl, PODCAST_COVER_SIZE } from "@/lib/site/urls";

type CoverVariantKey = keyof EpisodeCoverImage;

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

function resolveCoverUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return absoluteFromPath(path);
}

function variantUrl(variant?: EpisodeCoverVariant): string | null {
  const raw = variant?.url?.trim() ?? "";
  if (!raw) {
    return null;
  }
  return resolveCoverUrl(raw);
}

function resolveCoverFromEpisode(
  episode: Episode,
  order: readonly CoverVariantKey[],
  options?: { preferUseForRss?: boolean },
): string {
  const cover = episode.coverImage;
  if (!cover) {
    return getPodcastCoverAbsoluteUrl();
  }

  if (options?.preferUseForRss) {
    for (const key of order) {
      const variant = cover[key];
      if (variant?.useForRss) {
        const url = variantUrl(variant);
        if (url) {
          return url;
        }
      }
    }
  }

  for (const key of order) {
    const url = variantUrl(cover[key]);
    if (url) {
      return url;
    }
  }

  return getPodcastCoverAbsoluteUrl();
}

export function resolveEpisodeCoverImageUrl(episode: Episode): string {
  return resolveCoverFromEpisode(episode, ["dark", "light"]);
}

export function resolveEpisodeCoverImageUrlForRss(episode: Episode): string {
  return resolveCoverFromEpisode(episode, ["light", "dark"], { preferUseForRss: true });
}

export function resolveEpisodeCoverForMeta(episode: Episode): {
  url: string;
  type: string;
  width?: number;
  height?: number;
} {
  const cover = episode.coverImage;
  const hasEpisodeCover = Boolean(cover && (variantUrl(cover.dark) || variantUrl(cover.light)));
  const url = resolveEpisodeCoverImageUrl(episode);

  return {
    url,
    type: imageMimeFromPathOrUrl(url),
    ...(hasEpisodeCover
      ? {}
      : { width: PODCAST_COVER_SIZE.width, height: PODCAST_COVER_SIZE.height }),
  };
}
