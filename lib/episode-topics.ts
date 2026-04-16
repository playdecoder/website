import type { Episode } from "@/lib/episode-catalog";

function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function topicSlug(tag: string): string {
  return slugPart(tag) || "topic";
}

export function getTopicEntries(episodes: Episode[]) {
  const seen = new Map<string, string>();

  for (const episode of episodes) {
    for (const tag of episode.tags) {
      const slug = topicSlug(tag);
      if (!seen.has(slug)) {
        seen.set(slug, tag);
      }
    }
  }

  return [...seen.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "cs"));
}

export function findTopicLabelBySlug(episodes: Episode[], slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return getTopicEntries(episodes).find((entry) => entry.slug === normalized)?.label ?? null;
}
