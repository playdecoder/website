"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { navigateToLocale } from "@/lib/navigate-to-locale";

const LABELS: Record<string, string> = {
  en: "EN",
  cs: "CS",
};

export function LangSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");

  const idx = routing.locales.indexOf(locale as (typeof routing.locales)[number]);
  const nextLocale = routing.locales[(idx + 1) % routing.locales.length];

  const label = LABELS[locale] ?? locale.toUpperCase();
  const targetNameKey = `languageName.${nextLocale}` as "languageName.en" | "languageName.cs";
  const targetLanguageLabel = t(targetNameKey);

  return (
    <button
      type="button"
      onClick={() => navigateToLocale(nextLocale, pathname, locale)}
      className="border-edge text-muted hover:text-primary hover:border-primary/40 group focus-visible:ring-secondary/50 focus-visible:ring-offset-bg flex size-10 shrink-0 items-center justify-center rounded-sm border bg-transparent font-mono text-[10px] font-semibold tracking-[0.18em] uppercase transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      aria-label={t("switchToLanguage", { language: targetLanguageLabel })}
      title={t("switchToLanguage", { language: targetLanguageLabel })}
    >
      <span className="transition-transform duration-200 select-none group-hover:-translate-y-px">
        {label}
      </span>
    </button>
  );
}
