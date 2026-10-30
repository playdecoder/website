import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { episodePlatformUrl, resolveListenEpisodeParam } from "./lib/episode/catalog";
import { INCOMING_PATHNAME_HEADER } from "./lib/routing/incoming-pathname";
import {
  LISTEN_KIT_SEGMENT,
  LISTEN_PLATFORMS,
  type ListenPlatform,
  listenEpisodeKitPath,
  listenEpisodePath,
} from "./lib/routing/routes";

const intlMiddleware = createMiddleware(routing);

const LISTEN_PATH = new RegExp(
  `^(?:/(en|cs))?/listen/([^/]+)(?:/(${[LISTEN_KIT_SEGMENT, ...LISTEN_PLATFORMS].join("|")}))?/?$`,
  // People type these by hand (`/listen/SP03/Spotify`), so the suffix ignores case like the id does.
  "i",
);

function isListenPlatform(value: string | undefined): value is ListenPlatform {
  return (LISTEN_PLATFORMS as readonly string[]).includes(value ?? "");
}

/**
 * Listen pages are fully static, so an unknown segment would 404. When the series id
 * prefix (`sp03`, `ep4`, …) matches an episode, send the visitor to the canonical slug
 * instead. 308 is safe to cache: a stale target is itself a wrong slug and redirects again.
 *
 * `/listen/<ep>/<platform>` goes to the episode on that platform, or to the episode page until
 * the platform link is filled in. That one is 307 + no-store, so a link added later takes effect
 * for everyone at once.
 */
function canonicalListenRedirect(req: NextRequest): NextResponse | null {
  const match = LISTEN_PATH.exec(req.nextUrl.pathname);
  if (!match) return null;

  const [, locale, rawSegment, rawSuffix] = match;
  const suffix = rawSuffix?.toLowerCase();
  let segment: string;
  try {
    segment = decodeURIComponent(rawSegment);
  } catch {
    return null;
  }

  const resolved = resolveListenEpisodeParam(segment);
  if (!resolved) return null;
  const localePrefix = locale && locale !== routing.defaultLocale ? `/${locale}` : "";

  if (isListenPlatform(suffix)) {
    const platformUrl = episodePlatformUrl(resolved.episode, suffix);
    const target = platformUrl
      ? new URL(platformUrl)
      : new URL(`${localePrefix}${listenEpisodePath(resolved.canonicalSegment)}`, req.url);
    const response = NextResponse.redirect(target, 307);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (resolved.canonicalSegment === segment) return null;
  const url = req.nextUrl.clone();
  const path = suffix === LISTEN_KIT_SEGMENT ? listenEpisodeKitPath : listenEpisodePath;
  url.pathname = `${localePrefix}${path(resolved.canonicalSegment)}`;
  return NextResponse.redirect(url, 308);
}

export default function proxy(req: NextRequest) {
  const response = canonicalListenRedirect(req) ?? intlMiddleware(req);
  response.headers.set(INCOMING_PATHNAME_HEADER, req.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
