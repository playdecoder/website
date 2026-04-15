import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";

import { routing } from "@/i18n/routing";
import { brandInterpolation } from "@/lib/brand";
import { INCOMING_PATHNAME_HEADER, localeFromIncomingPathname } from "@/lib/incoming-pathname";

import { DecoderNotFoundView } from "./components/not-found-view";

type AppLocale = (typeof routing.locales)[number];

type Props = {
  params?: Promise<{ locale: string }>;
};

function resolveLocale(raw: string): AppLocale {
  return routing.locales.includes(raw as AppLocale) ? (raw as AppLocale) : routing.defaultLocale;
}

async function localeFromContext(params: Props["params"]): Promise<AppLocale> {
  if (params) {
    const { locale: raw } = await params;
    const resolved = resolveLocale(raw);
    if (resolved !== routing.defaultLocale || raw === routing.defaultLocale) {
      return resolved;
    }
  }
  const headerList = await headers();
  const pathname = headerList.get(INCOMING_PATHNAME_HEADER);
  if (pathname) {
    return localeFromIncomingPathname(pathname);
  }
  return routing.defaultLocale;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const locale = await localeFromContext(props.params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  const b = brandInterpolation(locale);
  return {
    title: t("notFoundTitle", b),
    description: t("notFoundDescription", b),
  };
}

export default async function NotFound(props: Props) {
  const locale = await localeFromContext(props.params);
  setRequestLocale(locale);
  return <DecoderNotFoundView locale={locale} />;
}
