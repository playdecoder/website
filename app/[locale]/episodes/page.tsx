import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { episodes } from "@/lib/episode-catalog";
import { localizedAlternates } from "@/lib/metadata-alternates";
import { ROUTES } from "@/lib/routes";

import { EpisodesArchiveClient } from "../components/episode/episodes-archive-client";
import { Navbar } from "../components/layout/navbar";
import { Contact } from "../components/sections/contact";
import { SectionHeading } from "../components/ui/section-heading";

export const dynamic = "force-static";
export const revalidate = false;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("episodesArchiveTitle"),
    description: t("episodesArchiveDescription"),
    alternates: localizedAlternates(ROUTES.episodes, locale),
    openGraph: {
      title: t("episodesArchiveTitle"),
      description: t("episodesArchiveDescription"),
    },
  };
}

export default async function EpisodesArchivePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "episodesPage" });

  return (
    <div className="page-shell">
      <Navbar locale={locale} />

      <main className="pt-16">
        <header className="border-edge relative overflow-hidden border-b">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-35" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-5 py-14 md:py-20">
            <SectionHeading variant="rail" label={t("label")} barSize={0.85} className="mb-8" />

            <div className="scroll-reveal max-w-3xl">
              <h1
                className="font-display text-primary mb-4 leading-[1.05] font-bold"
                style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
              >
                {t("heading")}
              </h1>
              <p className="text-muted max-w-2xl text-base leading-relaxed md:text-lg">
                {t("intro")}
              </p>
            </div>
          </div>
        </header>

        <EpisodesArchiveClient episodes={episodes} />
        <Contact locale={locale} />
      </main>
    </div>
  );
}
