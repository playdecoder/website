import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { brandInterpolation } from "@/lib/brand";
import { ROUTES } from "@/lib/routes";
import { localizedAlternates } from "@/lib/metadata-alternates";
import { showTaglineEn } from "@/lib/show";

import { Episodes } from "./components/episode/episodes";
import { Navbar } from "./components/layout/navbar";
import { About } from "./components/sections/about";
import { ContinueListening } from "./components/sections/continue-listening";
import { Contact } from "./components/sections/contact";
import { Hero } from "./components/sections/hero";
import { Hosts } from "./components/sections/hosts";
import { StartHere } from "./components/sections/start-here";

export const dynamic = "force-static";
export const revalidate = false;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const b = brandInterpolation(locale);
  return {
    title: t("homeTitle", b),
    description: locale === "en" ? showTaglineEn() : t("siteDescription"),
    alternates: localizedAlternates(ROUTES.home, locale),
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="page-shell">
      <Navbar locale={locale} />
      <main>
        <Hero locale={locale} />
        <ContinueListening locale={locale} />
        <About locale={locale} />
        <StartHere locale={locale} />
        <Hosts locale={locale} />
        <Episodes locale={locale} />
        <Contact locale={locale} />
      </main>
    </div>
  );
}
