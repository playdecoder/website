export type SiteLocale = "cs" | "en";

function pickLocaleFormatter<T>(map: Record<SiteLocale, T>, locale: string): T {
  if (locale in map) {
    return map[locale as SiteLocale];
  }
  return map.en;
}

const EPISODE_DATE_FORMATTERS = {
  cs: new Intl.DateTimeFormat("cs", { year: "numeric", month: "long", day: "numeric" }),
  en: new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" }),
} as const;

const CATALOG_HOURS_FORMATTERS = {
  cs: new Intl.NumberFormat("cs", { minimumFractionDigits: 0, maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat("en", { minimumFractionDigits: 0, maximumFractionDigits: 1 }),
} as const;

const ABOUT_STAT_COUNT_FORMATTERS = {
  cs: new Intl.NumberFormat("cs"),
  en: new Intl.NumberFormat("en"),
} as const;

const EPISODE_AIR_MONTH_FORMATTERS = {
  cs: new Intl.DateTimeFormat("cs", { month: "short" }),
  en: new Intl.DateTimeFormat("en", { month: "short" }),
} as const;

export function getEpisodeDateFormatter(locale: string): Intl.DateTimeFormat {
  return pickLocaleFormatter(EPISODE_DATE_FORMATTERS, locale);
}

export function getCatalogHoursFormatter(locale: string): Intl.NumberFormat {
  return pickLocaleFormatter(CATALOG_HOURS_FORMATTERS, locale);
}

function getAboutStatCountFormatter(locale: string): Intl.NumberFormat {
  return pickLocaleFormatter(ABOUT_STAT_COUNT_FORMATTERS, locale);
}

export function getEpisodeAirMonthFormatter(locale: string): Intl.DateTimeFormat {
  return pickLocaleFormatter(EPISODE_AIR_MONTH_FORMATTERS, locale);
}

export function formatAboutStatCount(value: number, locale: string): string {
  return getAboutStatCountFormatter(locale).format(value);
}
