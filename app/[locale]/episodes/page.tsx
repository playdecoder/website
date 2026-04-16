import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { brandInterpolation } from "@/lib/brand";
import { episodes } from "@/lib/episode-catalog";
import { linkLocale } from "@/lib/link-locale";
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
  const b = brandInterpolation(locale);
  return {
    title: t("episodesArchiveTitle", b),
    description: t("episodesArchiveDescription", b),
    alternates: localizedAlternates(ROUTES.episodes, locale),
    openGraph: {
      title: t("episodesArchiveTitle", b),
      description: t("episodesArchiveDescription", b),
    },
  };
}

const topicsSiblingLinkClass =
  "text-secondary border-secondary/35 hover:border-secondary/55 hover:bg-secondary/8 focus-visible:outline-secondary mt-6 inline-flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export default async function EpisodesArchivePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "episodesPage" });
  const hrefLocale = linkLocale(locale);

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
                <span className="text-primary">{t("headingLead")}</span>{" "}
                <span className="bg-gradient-to-r from-secondary via-secondary to-[color-mix(in_srgb,var(--accent)_82%,var(--secondary))] bg-clip-text text-transparent">
                  {t("headingAccent")}
                </span>
              </h1>
              <p className="font-body text-muted max-w-2xl text-base leading-relaxed md:text-lg">
                {t("intro")}
              </p>
              <Link
                href={ROUTES.topics}
                locale={hrefLocale}
                prefetch
                className={topicsSiblingLinkClass}
              >
                {t("browseTopics")}
                <span className="text-base leading-none" aria-hidden>
                  ↗
                </span>
              </Link>
            </div>
          </div>
        </header>

        <EpisodesArchiveClient episodes={episodes} />
        <Contact locale={locale} />
      </main>
    </div>
  );
}
