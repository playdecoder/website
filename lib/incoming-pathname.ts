import { routing } from "@/i18n/routing";

/**
 * Request header name used to forward the original URL pathname through
 * Next.js middleware so that special files (not-found.tsx, error.tsx) which
 * receive no route params can still derive the active locale.
 */
export const INCOMING_PATHNAME_HEADER = "x-pathname" as const;

type AppLocale = (typeof routing.locales)[number];

/**
 * Derives the active locale from the raw request pathname.
 *
 * Routing is configured with `localePrefix: "as-needed"`, meaning only
 * non-default locales carry a path prefix (e.g. `/en/listen/…`). Any path
 * without a recognised locale prefix belongs to the default locale.
 */
export function localeFromIncomingPathname(pathname: string): AppLocale {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale as AppLocale;
    }
  }
  return routing.defaultLocale as AppLocale;
}
