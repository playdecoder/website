const LOCALES = ["en", "cs"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const BRAND_NAME = "Dekodér";

export const BRAND_PODCAST = "Podcast Dekodér";

const BRAND_NAME_GENITIVE: Record<AppLocale, string> = {
  en: "Dekodér",
  cs: "Dekodéru",
};

function resolveLocale(locale: string): AppLocale {
  return LOCALES.includes(locale as AppLocale) ? (locale as AppLocale) : "cs";
}

export function brandInterpolation(locale: string) {
  const loc = resolveLocale(locale);
  return {
    brand: BRAND_NAME,
    brandPodcast: BRAND_PODCAST,
    brandGenitive: BRAND_NAME_GENITIVE[loc],
    brandUpper: BRAND_NAME.toUpperCase(),
  } as const;
}
