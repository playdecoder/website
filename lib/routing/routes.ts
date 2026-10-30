const ROUTE_SEGMENTS = {
  listen: "listen",
  episodes: "episodes",
  topics: "topics",
  attribution: "attribution",
} as const;

export const ROUTES = {
  home: "/",
  episodes: `/${ROUTE_SEGMENTS.episodes}`,
  topics: `/${ROUTE_SEGMENTS.topics}`,
  attribution: `/${ROUTE_SEGMENTS.attribution}`,
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

/** Unlisted share kit for guests: links, copy, and social frames for one episode. */
export const LISTEN_KIT_SEGMENT = "kit";

export function listenEpisodeKitPath(pathSegment: string): string {
  return `${listenEpisodePath(pathSegment)}/${LISTEN_KIT_SEGMENT}`;
}

/** Short branded links (`/listen/sp03/apple`) that redirect to the episode on each platform. */
export const LISTEN_PLATFORMS = ["spotify", "apple", "youtube"] as const;
export type ListenPlatform = (typeof LISTEN_PLATFORMS)[number];

export function listenEpisodePlatformPath(pathSegment: string, platform: ListenPlatform): string {
  return `${listenEpisodePath(pathSegment)}/${platform}`;
}

export function topicPath(topicSlug: string): string {
  return `${ROUTES.topics}/${topicSlug}`;
}

export function absoluteListenEpisodeUrl(siteOrigin: string, pathSegment: string): string {
  const base = siteOrigin.replace(/\/$/, "");
  return `${base}${listenEpisodePath(pathSegment)}`;
}
