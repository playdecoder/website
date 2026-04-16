import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { brandInterpolation } from "@/lib/brand";
import { episodes } from "@/lib/episode-catalog";
import { getTopicIndexEntries, topicMicroWaveBars } from "@/lib/episode-topics";
import { linkLocale } from "@/lib/link-locale";
import { localizedAlternates } from "@/lib/metadata-alternates";
import { ROUTES, topicPath } from "@/lib/routes";

import { Navbar } from "../components/layout/navbar";
import { Contact } from "../components/sections/contact";
import { SectionHeading } from "../components/ui/section-heading";

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
                <span className="bg-gradient-to-r from-secondary via-secondary to-[color-mix(in_srgb,var(--accent)_82%,var(--secondary))] bg-clip-text text-transparent">
                  {t("indexTitleAccent")}
                </span>
              </h1>
              <p className="font-body text-muted max-w-2xl text-base leading-relaxed md:text-lg">
                {t("indexIntro")}
              </p>
              <Link
                href={ROUTES.episodes}
                locale={hrefLocale}
                prefetch
                className={archiveSiblingLinkClass}
              >
                {t("indexLinkToEpisodes")}
                <span className="text-base leading-none" aria-hidden>
                  ↗
                </span>
              </Link>
            </div>
          </div>
        </header>

        <ul
          aria-label={t("indexListAria")}
          className="mx-auto max-w-6xl list-none px-5 py-12 md:py-16 sm:columns-2 xl:columns-3 [column-gap:1.125rem]"
        >
          {entries.map(({ slug, label, episodeCount }, i) => {
            const bars = topicMicroWaveBars(slug, 11);
            const isHot = episodeCount >= hotThreshold;
            return (
              <li
                key={slug}
                className="scroll-reveal mb-3 break-inside-avoid sm:mb-[1.125rem]"
                style={{ animationDelay: `${Math.min(0.45, 0.028 * i)}s` }}
              >
                <Link
                  href={topicPath(slug)}
                  locale={hrefLocale}
                  prefetch
                  aria-label={`${label}. ${t("indexEpisodeCount", { count: episodeCount })}. ${t("indexOpenTopic")}.`}
                  className={`topics-topic-card group border-edge/75 text-primary focus-visible:outline-secondary relative flex min-h-[4.75rem] w-full items-stretch overflow-hidden rounded-sm border bg-gradient-to-br from-[color-mix(in_srgb,var(--surface)_52%,transparent)] to-transparent shadow-[inset_0_1px_0_color-mix(in_srgb,var(--primary)_5%,transparent)] transition-[border-color,box-shadow,transform] duration-300 hover:border-secondary/45 hover:shadow-[0_20px_56px_-28px_color-mix(in_srgb,var(--secondary)_42%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.985] active:border-secondary/50 dark:from-[color-mix(in_srgb,var(--surface-2)_28%,transparent)] ${
                    isHot ? "border-l-[3px] border-l-accent pl-0" : ""
                  }`}
                >
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(ellipse 90% 80% at 0% 50%, color-mix(in srgb, var(--secondary) 8%, transparent), transparent 62%)",
                    }}
                    aria-hidden
                  />

                  <div
                    className="relative flex shrink-0 items-end justify-center gap-px self-stretch px-2.5 py-3 sm:px-3 sm:py-4"
                    aria-hidden
                  >
                    {bars.map((pct, bi) => (
                      <span
                        key={bi}
                        className="topics-topic-card__bar origin-bottom max-sm:max-h-[2.85rem] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:motion-safe:scale-y-[1.14]"
                        style={{
                          height: `${pct}%`,
                          maxHeight: "3.25rem",
                          background:
                            bi % 4 === 0
                              ? "var(--waveform-accent)"
                              : bi % 3 === 0
                                ? "var(--waveform-secondary)"
                                : "var(--waveform-primary)",
                          opacity: 0.32 + (bi % 6) * 0.09,
                        }}
                      />
                    ))}
                  </div>

                  <div className="relative flex min-w-0 flex-1 flex-col justify-center py-3 pr-2 pl-1 sm:py-4 sm:pr-3 sm:pl-0">
                    <p className="font-display text-primary text-lg leading-[1.15] font-semibold tracking-tight sm:text-xl">
                      {label}
                    </p>
                    <p className="text-muted mt-1.5 font-mono text-[10px] tracking-[0.18em] uppercase sm:text-[11px] sm:tracking-[0.2em]">
                      {t("indexEpisodeCount", { count: episodeCount })}
                    </p>
                  </div>

                  <div className="relative flex shrink-0 items-center pr-2.5 sm:pr-3">
                    <span
                      className="border-edge/70 text-muted group-hover:border-accent/40 group-hover:text-accent-text flex size-9 shrink-0 items-center justify-center rounded-sm border bg-[color-mix(in_srgb,var(--surface-2)_65%,transparent)] text-base font-medium transition-all duration-300 group-hover:-translate-y-px group-hover:shadow-[0_6px_20px_-8px_color-mix(in_srgb,var(--accent)_35%,transparent)] sm:size-10"
                      aria-hidden
                    >
                      ↗
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <Contact locale={locale} />
      </main>
    </div>
  );
}
