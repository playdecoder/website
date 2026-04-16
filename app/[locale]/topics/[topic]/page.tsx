import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { episodes } from "@/lib/episode-catalog";
import { findTopicLabelBySlug, getTopicEntries } from "@/lib/episode-topics";
import { localizedAlternates } from "@/lib/metadata-alternates";
import { topicPath } from "@/lib/routes";

import { EpisodesArchiveClient } from "../../components/episode/episodes-archive-client";
import { Navbar } from "../../components/layout/navbar";
import { Contact } from "../../components/sections/contact";
import { SectionHeading } from "../../components/ui/section-heading";

interface TopicPageProps {
  params: Promise<{ locale: string; topic: string }>;
}

export async function generateStaticParams() {
  return getTopicEntries(episodes).map(({ slug }) => ({ topic: slug }));
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { locale, topic } = await params;
  const label = findTopicLabelBySlug(episodes, topic);
  if (!label) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "topics" });
  return {
    title: t("metaTitle", { topic: label }),
    description: t("metaDescription", { topic: label }),
    alternates: localizedAlternates(topicPath(topic), locale),
    openGraph: {
      title: t("metaTitle", { topic: label }),
      description: t("metaDescription", { topic: label }),
    },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { locale, topic } = await params;
  setRequestLocale(locale);

  const label = findTopicLabelBySlug(episodes, topic);
  if (!label) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "topics" });

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
                {t("heading", { topic: label })}
              </h1>
              <p className="font-body text-muted max-w-2xl text-base leading-relaxed md:text-lg">
                {t("intro", { topic: label })}
              </p>
            </div>
          </div>
        </header>

        <EpisodesArchiveClient
          episodes={episodes}
          initialSelectedTags={[label]}
          topicFilterLocked
        />
        <Contact locale={locale} />
      </main>
    </div>
  );
}
