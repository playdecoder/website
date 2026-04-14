/**
 * Central app paths (locale-relative; use with next-intl Link/redirect or next/link).
 * Folder names under app/[locale]/ should stay aligned with ROUTE_SEGMENTS.
 */

export const ROUTE_SEGMENTS = {
  listen: "listen",
  episodes: "episodes",
} as const;

export const ROUTES = {
  home: "/",
  episodes: `/${ROUTE_SEGMENTS.episodes}`,
  rssFeed: "/rss.xml",
} as const;

/** DOM id= values on the home page — keep in sync with section components. */
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

/** Absolute episode page URL for feeds, sharing, etc. */
export function absoluteListenEpisodeUrl(siteOrigin: string, pathSegment: string): string {
  const base = siteOrigin.replace(/\/$/, "");
  return `${base}${listenEpisodePath(pathSegment)}`;
}
