import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { resolveListenEpisodeParam } from "./lib/episode/catalog";
import { INCOMING_PATHNAME_HEADER } from "./lib/routing/incoming-pathname";
import { listenEpisodePath } from "./lib/routing/routes";

const intlMiddleware = createMiddleware(routing);

const LISTEN_PATH = /^(?:\/(en|cs))?\/listen\/([^/]+)\/?$/;

/**
 * Listen pages are fully static, so an unknown segment would 404. When the series id
 * prefix (`sp03`, `ep4`, …) matches an episode, send the visitor to the canonical slug
 * instead. 308 is safe to cache: a stale target is itself a wrong slug and redirects again.
 */
function canonicalListenRedirect(req: NextRequest): NextResponse | null {
  const match = LISTEN_PATH.exec(req.nextUrl.pathname);
  if (!match) return null;

  const [, locale, rawSegment] = match;
  let segment: string;
  try {
    segment = decodeURIComponent(rawSegment);
  } catch {
    return null;
  }

  const resolved = resolveListenEpisodeParam(segment);
  if (!resolved || resolved.canonicalSegment === segment) return null;

  const localePrefix = locale && locale !== routing.defaultLocale ? `/${locale}` : "";
  const url = req.nextUrl.clone();
  url.pathname = `${localePrefix}${listenEpisodePath(resolved.canonicalSegment)}`;
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
