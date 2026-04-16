export const ROUTE_SEGMENTS = {
  listen: "listen",
  episodes: "episodes",
  topics: "topics",
} as const;

export const ROUTES = {
  home: "/",
  episodes: `/${ROUTE_SEGMENTS.episodes}`,
  topics: `/${ROUTE_SEGMENTS.topics}`,
  rssFeed: "/rss.xml",
} as const;

export const PAGE_SECTION_ID = {
  top: "top",
  about: "about",
  hosts: "hosts",
  contact: "contact",
  episodes: "episodes",
} as const;

export type HomeHashSectionKey = "about" | "hosts" | "contact";

export function homeSectionPath(section: HomeHashSectionKey): string {
  return `${ROUTES.home}#${PAGE_SECTION_ID[section]}`;
}

export function listenEpisodePath(pathSegment: string): string {
  return `/${ROUTE_SEGMENTS.listen}/${pathSegment}`;
}

export function topicPath(topicSlug: string): string {
  return `${ROUTES.topics}/${topicSlug}`;
}

export function absoluteListenEpisodeUrl(siteOrigin: string, pathSegment: string): string {
  const base = siteOrigin.replace(/\/$/, "");
  return `${base}${listenEpisodePath(pathSegment)}`;
}
