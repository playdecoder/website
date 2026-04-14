import episodesJson from "@/data/episodes.json";

export type BarColor = "primary" | "secondary" | "accent";

export interface EpisodeLinks {
  spotify: string;
  applePodcasts: string;
  youtube: string;
  mp3: string;
  transcript?: string;
}

export interface EpisodeChapter {
  t: number;
  label: string;
}

export interface EpisodeHost {
  fullName: string;
  link: string;
}

export interface Episode {
  id: string;
  slug: string;
  lang: string;
  title: string;
  date: string;
  duration: number;
  description: string;
  tags: string[];
  coverImage?: string;
  links: EpisodeLinks;
  chapters?: EpisodeChapter[];
  hosts?: EpisodeHost[];
}

export const episodes: Episode[] = episodesJson;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseEpisodeIsoDate(isoDate: string): Date | null {
  const m = ISO_DATE.exec(isoDate.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  return new Date(y, monthIndex, day);
}

function episodeDateTime(ep: Episode): number {
  return parseEpisodeIsoDate(ep.date)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

export function getLatestEpisode(eps: Episode[]): Episode | undefined {
  if (eps.length === 0) {
    return undefined;
  }
  return eps.reduce((best, ep) => {
    const tEp = episodeDateTime(ep);
    const tBest = episodeDateTime(best);
    if (tEp > tBest) {
      return ep;
    }
    if (tEp < tBest) {
      return best;
    }
    return ep.id.localeCompare(best.id) > 0 ? ep : best;
  });
}

export function formatEpisodeDate(isoDate: string, locale: string): string {
  const date = parseEpisodeIsoDate(isoDate);
  if (!date) {
    return isoDate;
  }
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatEpisodeDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    if (m > 0) {
      return `${h}h ${m}m`;
    }
    return `${h}h`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  if (sec > 0) {
    return `${sec}s`;
  }
  return "0m";
}

export function formatEpisodeDurationIso8601(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s === 0) {
    return "PT0S";
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  let out = "PT";
  if (h > 0) {
    out += `${h}H`;
  }
  if (m > 0) {
    out += `${m}M`;
  }
  if (sec > 0) {
    out += `${sec}S`;
  }
  return out;
}

export function totalEpisodeCatalogSeconds(eps: Episode[]): number {
  return eps.reduce((sum, e) => sum + Math.max(0, Math.floor(e.duration)), 0);
}

export function formatCatalogHours(totalSeconds: number, locale: string): string {
  const hours = Math.max(0, totalSeconds) / 3600;
  const rounded = Math.round(hours * 10) / 10;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(rounded);
  return locale.startsWith("cs") ? `${formatted}\u00A0h` : `${formatted}h`;
}

export function getEpisodeArchiveFacets(eps: Episode[]) {
  const tags = [...new Set(eps.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b));
  const langs = [...new Set(eps.map((e) => e.lang))].sort();
  return { tags, langs };
}

export function getEpisodeById(paramId: string): Episode | undefined {
  const id = paramId.trim().toUpperCase();
  return episodes.find((e) => e.id.toUpperCase() === id);
}

const LISTEN_EP_SHORT = /^ep(\d+)$/i;
const LISTEN_EP_FULL = /^ep(\d+)-(.+)$/i;

export function episodeOrdinal(ep: Episode): number {
  return parseInt(ep.id.replace(/\D/g, ""), 10) || 0;
}

export function episodeListenSlugPrefix(ep: Episode): string {
  return `ep${String(episodeOrdinal(ep)).padStart(2, "0")}`;
}

export function episodeListenPathSegment(ep: Episode): string {
  return `${episodeListenSlugPrefix(ep)}-${ep.slug}`;
}

function findEpisodeByOrdinal(n: number): Episode | undefined {
  return episodes.find((e) => episodeOrdinal(e) === n);
}

export function resolveListenEpisodeParam(param: string): {
  episode: Episode;
  canonicalSegment: string;
} | null {
  const raw = param.trim();
  if (!raw) {
    return null;
  }

  const byId = getEpisodeById(raw);
  if (byId) {
    return { episode: byId, canonicalSegment: episodeListenPathSegment(byId) };
  }

  const short = LISTEN_EP_SHORT.exec(raw);
  if (short && short[0].length === raw.length) {
    const n = parseInt(short[1], 10);
    const ep = findEpisodeByOrdinal(n);
    if (!ep) {
      return null;
    }
    return { episode: ep, canonicalSegment: episodeListenPathSegment(ep) };
  }

  const full = LISTEN_EP_FULL.exec(raw);
  if (full) {
    const n = parseInt(full[1], 10);
    const ep = findEpisodeByOrdinal(n);
    if (!ep) {
      return null;
    }
    return { episode: ep, canonicalSegment: episodeListenPathSegment(ep) };
  }

  return null;
}

export function getEpisodeNeighbors(episode: Episode): {
  older?: Episode;
  newer?: Episode;
} {
  const idx = episodes.findIndex((e) => e.id === episode.id);
  if (idx === -1) {
    return {};
  }
  return {
    older: episodes[idx + 1],
    newer: episodes[idx - 1],
  };
}

export function episodeLayoutSeed(episodeId: string): number {
  let h = 2166136261;
  for (let i = 0; i < episodeId.length; i++) {
    h ^= episodeId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const waveformBars: {
  h: number;
  dur: string;
  delay: string;
  color: BarColor;
}[] = [
  { h: 22, dur: "4.0s", delay: "0s", color: "primary" },
  { h: 38, dur: "3.6s", delay: "0.28s", color: "primary" },
  { h: 55, dur: "3.2s", delay: "0.08s", color: "primary" },
  { h: 44, dur: "3.8s", delay: "0.52s", color: "primary" },
  { h: 72, dur: "2.9s", delay: "0.18s", color: "secondary" },
  { h: 60, dur: "3.4s", delay: "0.64s", color: "primary" },
  { h: 90, dur: "2.7s", delay: "0.12s", color: "primary" },
  { h: 110, dur: "2.5s", delay: "0.40s", color: "secondary" },
  { h: 148, dur: "2.3s", delay: "0.06s", color: "primary" },
  { h: 180, dur: "2.2s", delay: "0.55s", color: "accent" },
  { h: 200, dur: "2.0s", delay: "0s", color: "accent" },
  { h: 175, dur: "2.2s", delay: "0.32s", color: "secondary" },
  { h: 145, dur: "2.4s", delay: "0.16s", color: "primary" },
  { h: 115, dur: "2.6s", delay: "0.46s", color: "primary" },
  { h: 88, dur: "2.8s", delay: "0.08s", color: "secondary" },
  { h: 65, dur: "3.2s", delay: "0.36s", color: "primary" },
  { h: 50, dur: "3.5s", delay: "0.14s", color: "primary" },
  { h: 35, dur: "3.8s", delay: "0.22s", color: "primary" },
  { h: 24, dur: "4.2s", delay: "0.48s", color: "primary" },
  { h: 14, dur: "4.5s", delay: "0.18s", color: "primary" },
];

export function waveformBarsForEpisode(episodeId: string) {
  const seed = episodeLayoutSeed(episodeId);
  const n = waveformBars.length;
  const offset = seed % n;
  return [...waveformBars.slice(offset), ...waveformBars.slice(0, offset)];
}

export const HOST_PHOTOS = {
  jan: "/photos/jan.webp",
  martin: "/photos/martin.webp",
} as const;

export const barColorCss: Record<BarColor, string> = {
  primary: "var(--waveform-primary)",
  secondary: "var(--waveform-secondary)",
  accent: "var(--waveform-accent)",
};
