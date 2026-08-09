import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ROUTES } from "@/lib/routing/routes";
import { brandInterpolation } from "@/lib/site/brand";
import { localizedAlternates } from "@/lib/site/metadata-alternates";
import { SITE_CONTACT_EMAIL, SITE_CONTACT_MAILTO } from "@/lib/site/socials";

import { Navbar } from "../components/layout/navbar";
import { LedeIntroParagraph } from "../components/ui/lede-intro-paragraph";
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
    title: t("attributionTitle", b),
    description: t("attributionDescription", b),
    alternates: localizedAlternates(ROUTES.attribution, locale),
    openGraph: {
      title: t("attributionTitle", b),
      description: t("attributionDescription", b),
    },
  };
}

type NoticeKey = "ownership" | "affiliation" | "branding" | "questions";

export default async function AttributionPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "attribution" });
  const b = brandInterpolation(locale);

  const notices: {
    key: NoticeKey;
    label: string;
    body: string;
    extras?: "ownership" | "questions";
  }[] = [
    {
      key: "ownership",
      label: t("ownershipLabel"),
      body: t("ownershipBody"),
      extras: "ownership",
    },
    {
      key: "affiliation",
      label: t("affiliationLabel"),
      body: t("affiliationBody", b),
    },
    {
      key: "branding",
      label: t("brandingLabel"),
      body: t("brandingBody", b),
    },
    {
      key: "questions",
      label: t("questionsLabel"),
      body: t("questionsBody"),
      extras: "questions",
    },
  ];

  return (
    <div className="page-shell">
      <Navbar locale={locale} />

      <main className="pt-16">
        <header className="border-edge relative overflow-hidden border-b">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-35" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,color-mix(in_oklab,var(--secondary)_14%,transparent),transparent_55%)]"
            aria-hidden
          />

          <div className="relative mx-auto max-w-6xl px-5 py-14 md:py-20">
            <SectionHeading variant="rail" label={t("railLabel")} barSize={0.85} className="mb-8" />

            <div className="scroll-reveal max-w-3xl">
              <h1
                className="font-display text-primary mb-4 leading-[1.05] font-bold text-balance"
                style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
              >
                <span className="text-primary">{t("titleLead")}</span>{" "}
                <span className="text-secondary">{t("titleAccent")}</span>
              </h1>
              <LedeIntroParagraph className="max-w-2xl leading-relaxed">
                {t("intro", b)}
              </LedeIntroParagraph>
            </div>
          </div>
        </header>

        <section className="relative py-16 md:py-24" aria-label={t("sectionsAria")}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--secondary)_40%,transparent)] to-transparent"
            aria-hidden
          />

          <ol className="relative mx-auto max-w-6xl list-none space-y-0 px-5">
            {notices.map((notice, index) => {
              const ord = String(index + 1).padStart(2, "0");
              const total = String(notices.length).padStart(2, "0");

              return (
                <li
                  key={notice.key}
                  className="scroll-reveal border-edge grid gap-6 border-b py-10 last:border-b-0 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-12 md:py-12"
                >
                  <div className="flex items-start gap-3 md:flex-col md:gap-4">
                    <span className="text-muted font-mono text-[11px] tracking-[0.22em] uppercase tabular-nums">
                      <span className="text-primary">{ord}</span>
                      <span className="opacity-45"> / {total}</span>
                    </span>
                    <span className="bg-accent mt-1.5 hidden h-0.5 w-10 md:block" aria-hidden />
                    <h2 className="font-display text-primary text-xl leading-tight font-bold md:text-2xl">
                      {notice.label}
                    </h2>
                  </div>

                  <div className="max-w-2xl space-y-4">
                    <p className="font-body text-muted text-base leading-[1.8] text-pretty md:text-lg">
                      {notice.body}
                    </p>

                    {notice.extras === "ownership" ? (
                      <div className="border-edge/80 bg-surface/55 space-y-3 border-l-2 border-l-secondary/50 py-1 pl-4">
                        <p className="text-muted font-mono text-[11px] tracking-[0.16em] uppercase">
                          {t("ownershipExamplesLead")}
                        </p>
                        <p className="font-body text-primary/85 text-base leading-[1.75] md:text-lg">
                          {t("ownershipExamples")}
                        </p>
                        <p className="font-body text-muted/80 text-sm leading-[1.7] md:text-base">
                          {t("ownershipFootnote")}
                        </p>
                      </div>
                    ) : null}

                    {notice.extras === "questions" ? (
                      <a
                        href={SITE_CONTACT_MAILTO}
                        className="text-secondary border-secondary/35 hover:border-secondary/55 hover:bg-secondary/8 focus-visible:outline-secondary inline-flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {t("questionsCta", { email: SITE_CONTACT_EMAIL })}
                        <span className="text-base leading-none" aria-hidden>
                          ↗
                        </span>
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
