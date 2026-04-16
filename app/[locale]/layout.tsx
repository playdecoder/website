import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { routing } from "@/i18n/routing";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { GlobalPlayerProvider } from "./components/player/global-player-provider";
import { Footer } from "./components/layout/footer";
import { HtmlLangSync } from "./html-lang-sync";

function isAppLocale(locale: string): locale is (typeof routing.locales)[number] {
  return routing.locales.includes(locale as (typeof routing.locales)[number]);
}

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NuqsAdapter>
        <HtmlLangSync />
        <GlobalPlayerProvider>
          {children}
          <Footer locale={locale} />
        </GlobalPlayerProvider>
      </NuqsAdapter>
    </NextIntlClientProvider>
  );
}
