import { routing } from "@/i18n/routing";

export const INCOMING_PATHNAME_HEADER = "x-pathname" as const;

type AppLocale = (typeof routing.locales)[number];

export function localeFromIncomingPathname(pathname: string): AppLocale {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale as AppLocale;
    }
  }
  return routing.defaultLocale as AppLocale;
}
