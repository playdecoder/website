import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { absoluteFromPath } from "@/lib/site";

export function localizedAlternates(href: string, locale: string) {
  const pathnameFor = (loc: string) => getPathname({ locale: loc, href });
  const languages: Record<string, string> = {
    cs: absoluteFromPath(pathnameFor("cs")),
    en: absoluteFromPath(pathnameFor("en")),
    "x-default": absoluteFromPath(pathnameFor(routing.defaultLocale)),
  };

  return {
    canonical: absoluteFromPath(pathnameFor(locale)),
    languages,
  };
}
