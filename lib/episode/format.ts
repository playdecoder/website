import {
  EPISODE_FORMAT_LABELS,
  EPISODE_FORMATS,
  type EpisodeFormat,
} from "@/lib/brand/format-tokens";

import { type Episode, episodeSeriesOrdinal } from "./catalog";

export type { EpisodeFormat };
export { EPISODE_FORMAT_LABELS, EPISODE_FORMATS };

export function getEpisodeFormat(ep: Episode): EpisodeFormat | undefined {
  return ep.format;
}

export function isSpecialEpisodeFormat(ep: Episode): boolean {
  return ep.format !== undefined;
}

/** iTunes only supports full | bonus | trailer — special formats map to bonus. */
export function resolveItunesEpisodeType(ep: Episode): "full" | "bonus" {
  return ep.format ? "bonus" : "full";
}

export function episodeCardRailClass(ep: Episode, isLatest: boolean): string {
  if (isLatest) {
    return "bg-brand-accent";
  }
  return ep.format ? `episode-format-rail--${ep.format}` : "bg-secondary";
}

export function getEpisodeFormatOrdinal(ep: Episode): number {
  if (!ep.format) {
    return 0;
  }
  return episodeSeriesOrdinal(ep);
}

export function composeFormattedEpisodeTitle(
  ep: Episode,
  _formatLabel?: string | undefined,
): string {
  return ep.title;
}

export function episodePublicationTitle(ep: Episode, formatLabel?: string): string {
  const label = formatLabel ?? (ep.format ? EPISODE_FORMAT_LABELS[ep.format] : undefined);
  return composeFormattedEpisodeTitle(ep, label);
}

export function episodeDisplayTags(ep: Episode): string[] {
  if (!ep.format) {
    return ep.tags;
  }
  const formatLabel = EPISODE_FORMAT_LABELS[ep.format].toLowerCase();
  return ep.tags.filter((tag) => tag.toLowerCase() !== formatLabel);
}
