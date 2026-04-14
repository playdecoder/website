import { getTranslations } from "next-intl/server";

import { episodes, formatCatalogHours, totalEpisodeCatalogSeconds } from "@/lib/episode-catalog";
import { PAGE_SECTION_ID } from "@/lib/routes";

import { SectionHeading } from "../ui/section-heading";

export async function About({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "about" });

  const catalogSeconds = totalEpisodeCatalogSeconds(episodes);
  const stats = [
    {
      value: new Intl.NumberFormat(locale).format(episodes.length),
      label: t("statEpisodes"),
    },
    {
      value: formatCatalogHours(catalogSeconds, locale),
      label: t("statContent"),
    },
    { value: t("statValueListeners"), label: t("statListeners") },
  ] as const;

  return (
    <section id={PAGE_SECTION_ID.about} className="border-edge relative border-t py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading variant="rail" label={t("label")} className="mb-16" />

        <div className="grid items-start gap-16 md:grid-cols-[1fr_1.1fr] md:gap-24">
          <div className="scroll-reveal">
            <blockquote
              className="font-display text-primary mb-8 leading-tight font-bold"
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}
            >
              &ldquo;{t("quoteBefore")}
              <br />
              {t("quoteMiddle1")}
              <br />
              {t("quoteMiddle2")}
              <br />
              <span className="text-accent-text">{t("quoteHighlight")}</span>&rdquo;
            </blockquote>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card pt-4">
                  <div className="stat-card__rule bg-accent mb-4 h-0.5" />
                  <div className="stat-card__value font-display text-primary mb-1 text-3xl font-extrabold">
                    {stat.value}
                  </div>
                  <div className="text-muted font-mono text-xs tracking-widest uppercase">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="scroll-reveal space-y-5">
            <p className="text-muted text-base leading-[1.8] md:text-lg">{t("p1")}</p>
            <p className="text-muted text-base leading-[1.8] md:text-lg">{t("p2")}</p>
            <p className="text-muted text-base leading-[1.8] md:text-lg">{t("p3")}</p>

            <div className="flex items-center gap-3 pt-2">
              <span
                className="bg-accent h-2 w-2 rounded-full"
                style={{ animation: "pulseDot 1.8s ease-in-out infinite" }}
              />
              <span className="text-muted font-mono text-xs tracking-widest uppercase">
                {t("cadence")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
