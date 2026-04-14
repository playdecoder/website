import {
  clampEpisodeFragmentSeconds,
  parseTimeFragmentFromHash,
} from "@/lib/episode-time-fragment";

export interface EpisodeHashChapter {
  t: number;
  label: string;
}

export function slugifyChapterKey(label: string): string {
  const s = label
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "chapter";
}

export function chapterFragmentKeys(
  chapters: EpisodeHashChapter[],
): Map<string, EpisodeHashChapter> {
  const sorted = [...chapters].sort((a, b) => a.t - b.t);
  const map = new Map<string, EpisodeHashChapter>();
  const countByBase = new Map<string, number>();
  for (const ch of sorted) {
    const base = slugifyChapterKey(ch.label);
    const n = (countByBase.get(base) ?? 0) + 1;
    countByBase.set(base, n);
    const key = n === 1 ? base : `${base}-at-${ch.t}`;
    map.set(key, ch);
  }
  return map;
}

export function getChapterFragmentKey(
  chapter: EpisodeHashChapter,
  chapters: EpisodeHashChapter[],
): string {
  const map = chapterFragmentKeys(chapters);
  for (const [key, ch] of map) {
    if (ch.t === chapter.t && ch.label === chapter.label) {
      return key;
    }
  }
  return `${slugifyChapterKey(chapter.label)}-at-${chapter.t}`;
}

export function parseHashQueryParams(hash: string): Record<string, string> {
  const body = hash.replace(/^#/, "").trim();
  const out: Record<string, string> = {};
  if (!body) {
    return out;
  }
  for (const part of body.split("&")) {
    if (!part) {
      continue;
    }
    const eq = part.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = part.slice(0, eq).trim().toLowerCase();
    try {
      out[key] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      out[key] = part.slice(eq + 1).trim();
    }
  }
  return out;
}

function parseTimeSecondsFromParams(hash: string, tParam: string | undefined): number | null {
  if (tParam !== undefined) {
    const n = Number(tParam);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return parseTimeFragmentFromHash(hash);
}

export interface ResolvedEpisodeHashSeek {
  seconds: number | null;
  fromChapter: boolean;
  chapterLabel: string | null;
}

export function resolveEpisodeSeekFromHash(
  hash: string,
  chapters: EpisodeHashChapter[] | undefined,
  duration: number,
): ResolvedEpisodeHashSeek {
  const params = parseHashQueryParams(hash);
  const chRaw = params.ch ?? params.chapter;
  const tParam = params.t;

  if (chRaw && chapters && chapters.length > 0) {
    const map = chapterFragmentKeys(chapters);
    const matched = map.get(chRaw);
    if (matched) {
      return {
        seconds: clampEpisodeFragmentSeconds(matched.t, duration),
        fromChapter: true,
        chapterLabel: matched.label,
      };
    }
  }

  const tSec = parseTimeSecondsFromParams(hash, tParam);
  if (tSec !== null) {
    return {
      seconds: clampEpisodeFragmentSeconds(tSec, duration),
      fromChapter: false,
      chapterLabel: null,
    };
  }

  return { seconds: null, fromChapter: false, chapterLabel: null };
}

export function formatChapterHash(key: string): string {
  return `ch=${encodeURIComponent(key)}`;
}
