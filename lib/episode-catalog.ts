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

export const heroWaveformBars: {
  h: number;
  dur: string;
  delay: string;
  color: BarColor;
  alt?: boolean;
}[] = [
  { h: 8,   dur: "5.4s", delay: "0.02s", color: "primary" },
  { h: 12,  dur: "5.1s", delay: "0.18s", color: "primary",   alt: true },
  { h: 17,  dur: "4.9s", delay: "0.08s", color: "primary" },
  { h: 22,  dur: "4.7s", delay: "0.32s", color: "primary",   alt: true },
  { h: 28,  dur: "4.5s", delay: "0.12s", color: "primary" },
  { h: 34,  dur: "4.3s", delay: "0.26s", color: "primary",   alt: true },
  { h: 41,  dur: "4.1s", delay: "0.06s", color: "primary" },
  { h: 48,  dur: "3.9s", delay: "0.40s", color: "primary",   alt: true },
  { h: 56,  dur: "3.7s", delay: "0.14s", color: "primary" },
  { h: 64,  dur: "3.5s", delay: "0.28s", color: "primary",   alt: true },
  { h: 73,  dur: "3.4s", delay: "0.04s", color: "primary" },
  { h: 82,  dur: "3.3s", delay: "0.22s", color: "primary",   alt: true },
  { h: 92,  dur: "3.2s", delay: "0.36s", color: "secondary" },
  { h: 102, dur: "3.1s", delay: "0.10s", color: "secondary", alt: true },
  { h: 113, dur: "3.0s", delay: "0.24s", color: "secondary" },
  { h: 124, dur: "2.9s", delay: "0.44s", color: "secondary", alt: true },
  { h: 135, dur: "2.8s", delay: "0.08s", color: "secondary" },
  { h: 146, dur: "2.7s", delay: "0.20s", color: "secondary", alt: true },
  { h: 157, dur: "2.6s", delay: "0.34s", color: "secondary" },
  { h: 167, dur: "2.5s", delay: "0.06s", color: "secondary", alt: true },
  { h: 176, dur: "2.4s", delay: "0.18s", color: "secondary" },
  { h: 184, dur: "2.3s", delay: "0.30s", color: "secondary", alt: true },
  { h: 190, dur: "2.2s", delay: "0.04s", color: "accent" },
  { h: 195, dur: "2.1s", delay: "0.14s", color: "accent",    alt: true },
  { h: 198, dur: "2.0s", delay: "0.22s", color: "accent" },
  { h: 200, dur: "1.9s", delay: "0.00s", color: "accent",    alt: true },
  { h: 200, dur: "1.9s", delay: "0.10s", color: "accent" },
  { h: 198, dur: "2.0s", delay: "0.16s", color: "accent",    alt: true },
  { h: 195, dur: "2.1s", delay: "0.06s", color: "accent" },
  { h: 190, dur: "2.2s", delay: "0.24s", color: "accent",    alt: true },
  { h: 184, dur: "2.3s", delay: "0.12s", color: "secondary" },
  { h: 176, dur: "2.4s", delay: "0.32s", color: "secondary", alt: true },
  { h: 167, dur: "2.5s", delay: "0.04s", color: "secondary" },
  { h: 157, dur: "2.6s", delay: "0.20s", color: "secondary", alt: true },
  { h: 146, dur: "2.7s", delay: "0.36s", color: "secondary" },
  { h: 135, dur: "2.8s", delay: "0.08s", color: "secondary", alt: true },
  { h: 124, dur: "2.9s", delay: "0.22s", color: "secondary" },
  { h: 113, dur: "3.0s", delay: "0.42s", color: "secondary", alt: true },
  { h: 102, dur: "3.1s", delay: "0.14s", color: "secondary" },
  { h: 92,  dur: "3.2s", delay: "0.28s", color: "primary",   alt: true },
  { h: 82,  dur: "3.3s", delay: "0.02s", color: "primary" },
  { h: 73,  dur: "3.4s", delay: "0.18s", color: "primary",   alt: true },
  { h: 64,  dur: "3.5s", delay: "0.38s", color: "primary" },
  { h: 56,  dur: "3.7s", delay: "0.10s", color: "primary",   alt: true },
  { h: 48,  dur: "3.9s", delay: "0.26s", color: "primary" },
  { h: 41,  dur: "4.1s", delay: "0.44s", color: "primary",   alt: true },
  { h: 34,  dur: "4.3s", delay: "0.08s", color: "primary" },
  { h: 28,  dur: "4.5s", delay: "0.20s", color: "primary",   alt: true },
  { h: 22,  dur: "4.7s", delay: "0.34s", color: "primary" },
  { h: 17,  dur: "4.9s", delay: "0.12s", color: "primary",   alt: true },
  { h: 12,  dur: "5.1s", delay: "0.30s", color: "primary" },
  { h: 8,   dur: "5.4s", delay: "0.16s", color: "primary",   alt: true },
];

function mulberry32(initial: number) {
  let a = initial >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ListenBackgroundMotion = 0 | 1 | 2;

export interface ListenBackgroundBar {
  h: number;
  dur: string;
  delay: string;
  color: BarColor;
  motion: ListenBackgroundMotion;
  ease: string;
  flexGrow: number;
}

const LISTEN_BG_BAR_COUNT = 26;

const LISTEN_BG_EASINGS = [
  "cubic-bezier(0.4, 0, 0.2, 1)",
  "cubic-bezier(0.45, 0, 0.35, 1)",
  "cubic-bezier(0.33, 0.1, 0.45, 1)",
  "cubic-bezier(0.55, 0, 0.45, 1)",
] as const;

export function listenBackgroundBarsForEpisode(episodeId: string): ListenBackgroundBar[] {
  const rand = mulberry32(episodeLayoutSeed(episodeId) ^ 0x9e3779b9);
  const n = LISTEN_BG_BAR_COUNT;
  const peak = 0.26 + rand() * 0.24;
  const fatness = 2.6 + rand() * 1.75;
  const tilt = 0.32 + rand() * 0.48;
  const raw: number[] = [];

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const dist = Math.abs(t - peak);
    const bump = Math.exp(-dist * dist * fatness);
    const bassLift = tilt * Math.pow(1 - t, 1.22) * 0.44;
    const air = (0.07 + 0.16 * t) * (0.55 + 0.45 * rand());
    const grain = 0.52 + 0.68 * rand();
    const spike = rand() > 0.92 ? 0.2 * rand() : 0;
    raw.push(Math.min(1, bump * grain + bassLift + air * 0.38 + spike));
  }

  const heights: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = raw[i - 1] ?? raw[i];
    const next = raw[i + 1] ?? raw[i];
    const smooth = 0.17 * prev + 0.66 * raw[i] + 0.17 * next;
    heights.push(Math.round(8 + smooth * 192));
  }

  return heights.map((h) => {
    const durS = 2.05 + rand() * 4.25;
    const delayS = rand() * 2.45;
    const motion = Math.floor(rand() * 3) % 3 as ListenBackgroundMotion;
    const ease = LISTEN_BG_EASINGS[Math.floor(rand() * LISTEN_BG_EASINGS.length) % LISTEN_BG_EASINGS.length];
    const flexGrow = 0.36 + rand() * 0.94;
    const hi = h / 200;
    const r = rand();
    const color: BarColor =
      hi > 0.76 && r < 0.2 ? "accent" : hi > 0.44 && r < 0.3 ? "secondary" : "primary";

    return {
      h,
      dur: `${durS.toFixed(2)}s`,
      delay: `${delayS.toFixed(3)}s`,
      color,
      motion,
      ease,
      flexGrow,
    };
  });
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
