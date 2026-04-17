import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties } from "react";

import { Link } from "@/i18n/navigation";
import { brandInterpolation } from "@/lib/brand";
import { episodes } from "@/lib/episode-catalog";
import { getTopicIndexEntries, topicMicroWaveBars } from "@/lib/episode-topics";
import { linkLocale } from "@/lib/link-locale";
import { localizedAlternates } from "@/lib/metadata-alternates";
import { ROUTES, topicPath } from "@/lib/routes";

import { Navbar } from "../components/layout/navbar";
import { Contact } from "../components/sections/contact";
import { IconArrowRight } from "../components/ui/icons";
import { LedeIntroParagraph } from "../components/ui/lede-intro-paragraph";
import { SectionHeading } from "../components/ui/section-heading";

function topicFrequency(slug: string): string {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 33) ^ slug.charCodeAt(i);
  }
  const tenths = Math.abs(h) % 210;
  const whole = 88 + Math.floor(tenths / 10);
  const dec = tenths % 10;
  return `${whole}.${dec}`;
}

export const dynamic = "force-static";
export const revalidate = false;

interface TopicsIndexPageProps {
  params: Promise<{ locale: string }>;
}

const archiveSiblingLinkClass =
  "text-secondary border-secondary/35 hover:border-secondary/55 hover:bg-secondary/8 focus-visible:outline-secondary mt-6 inline-flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export async function generateMetadata({ params }: TopicsIndexPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "topics" });
  const b = brandInterpolation(locale);
  return {
    title: t("indexMetaTitle", b),
    description: t("indexMetaDescription", b),
    alternates: localizedAlternates(ROUTES.topics, locale),
    openGraph: {
      title: t("indexMetaTitle", b),
      description: t("indexMetaDescription", b),
    },
  };
}

export default async function TopicsIndexPage({ params }: TopicsIndexPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "topics" });
  const hrefLocale = linkLocale(locale);
  const entries = getTopicIndexEntries(episodes);
  const maxCount = entries[0]?.episodeCount ?? 1;
  const hotThreshold = Math.max(2, Math.ceil(maxCount * 0.62));

  return (
    <div className="page-shell">
      <Navbar locale={locale} />

      <main className="pt-16">
        <header className="border-edge relative overflow-hidden border-b">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-35" aria-hidden />

          <div className="relative mx-auto max-w-6xl px-5 py-14 md:py-20">
            <SectionHeading
              variant="rail"
              label={t("indexRailLabel")}
              barSize={0.85}
              className="mb-8"
            />

            <div className="scroll-reveal max-w-3xl">
              <h1
                className="font-display text-primary mb-4 leading-[1.05] font-bold"
                style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
              >
                <span className="text-primary">{t("indexTitleLead")}</span>{" "}
                <span className="text-secondary">{t("indexTitleAccent")}</span>
              </h1>
              <LedeIntroParagraph className="max-w-2xl leading-relaxed">
                {t("indexIntro")}
              </LedeIntroParagraph>
              <Link
                href={ROUTES.episodes}
                locale={hrefLocale}
                prefetch
                className={archiveSiblingLinkClass}
              >
                {t("indexLinkToEpisodes")}
                <IconArrowRight size={14} className="shrink-0" />
              </Link>
            </div>
          </div>
        </header>

        <ol
          aria-label={t("indexListAria")}
          className="topic-log mx-auto max-w-6xl list-none px-5 md:px-7"
        >
          {entries.map(({ slug, label, episodeCount }, i) => {
            const bars = topicMicroWaveBars(slug, 32);
            const isHot = episodeCount >= hotThreshold;
            const indexLabel = String(i + 1).padStart(2, "0");
            const frequency = topicFrequency(slug);
            return (
              <li
                key={slug}
                className="topic-log__item scroll-reveal"
                style={{ animationDelay: `${Math.min(0.35, 0.04 * i)}s` }}
              >
                <Link
                  href={topicPath(slug)}
                  locale={hrefLocale}
                  prefetch
                  aria-label={`${label}. ${t("indexEpisodeCount", { count: episodeCount })}. ${t("indexOpenTopic")}.`}
                  className="topic-log__row focus-visible:outline-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <div className="topic-log__index">
                    <span
                      className={`topic-log__index-num${isHot ? " topic-log__index-num--hot" : ""}`}
                      aria-hidden
                    >
                      {indexLabel}
                      {isHot && <span className="topic-log__pulse" aria-hidden />}
                    </span>
                    <span className="topic-log__freq" aria-hidden>
                      {frequency} MHz
                    </span>
                  </div>

                  <div className="topic-log__main">
                    <h2 className="topic-log__label">{label}</h2>
                    <div className="topic-log__wave" aria-hidden>
                      {bars.map((pct, bi) => (
                        <span
                          key={bi}
                          className="topic-log__bar"
                          style={
                            {
                              height: `${pct}%`,
                              background:
                                bi % 7 === 0
                                  ? "var(--waveform-accent)"
                                  : bi % 3 === 0
                                    ? "var(--waveform-secondary)"
                                    : "var(--waveform-primary)",
                              opacity: 0.42 + (bi % 6) * 0.085,
                              "--bar-index": bi,
                            } as CSSProperties
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="topic-log__meta">
                    <span className="topic-log__count-unit" aria-hidden>
                      {t("indexEpisodeCount", { count: episodeCount })}
                    </span>
                    <span className="topic-log__cta" aria-hidden>
                      {t("indexOpenTopic")}
                      <IconArrowRight size={12} className="topic-log__cta-arrow shrink-0" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>

        <Contact locale={locale} />
      </main>
    </div>
  );
}
