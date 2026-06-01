import {
  type Episode,
  type EpisodeHost,
  parseEpisodeIsoDate,
} from "@/lib/episode/catalog";
import { getEpisodeAirMonthFormatter } from "@/lib/i18n/intl-formatters";

export function isHttpUrl(link: string): boolean {
  try {
    const u = new URL(link);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function trimEpisodeHosts(episode: Episode): EpisodeHost[] {
  if (!episode.hosts?.length) {
    return [];
  }
  const hosts: EpisodeHost[] = [];
  for (const host of episode.hosts) {
    const fullName = host.fullName?.trim() ?? "";
    const link = host.link?.trim() ?? "";
    if (fullName && link) {
      hosts.push({ fullName, link });
    }
  }
  return hosts;
}

export function hostInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export function episodeAirDateSpine(isoDate: string, locale: string): string {
  const d = parseEpisodeIsoDate(isoDate);
  if (!d) {
    return isoDate.replaceAll("-", "·");
  }
  const monthShort = getEpisodeAirMonthFormatter(locale)
    .format(d)
    .replace(/\./g, "")
    .trim()
    .toLocaleUpperCase(locale);
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}·${monthShort}·${year}`;
}
