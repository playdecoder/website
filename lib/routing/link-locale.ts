import { routing } from "@/i18n/routing";

export function linkLocale(locale?: string): string | undefined {
  return locale === routing.defaultLocale ? undefined : locale;
}
