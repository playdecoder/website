import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { episodes, episodeListenPathSegment, getLatestEpisode } from "@/lib/episode-catalog";
import { BRAND_NAME } from "@/lib/brand";
import { linkLocale } from "@/lib/link-locale";
import { PAGE_SECTION_ID, ROUTES, listenEpisodePath } from "@/lib/routes";

import { LogoD } from "../branding/logo-d";

import { HeroWaveform } from "./hero-waveform";
import { SignalLabelRail } from "./signal-label-rail";

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "hero" });
  const hrefLocale = linkLocale(locale);
  const latestEpisode = getLatestEpisode(episodes);
  if (!latestEpisode) {
    return null;
  }

  return (
    <section
      id={PAGE_SECTION_ID.top}
      className="dot-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-16"
    >
      <div className="hero-top-scanline pointer-events-none absolute inset-x-0 top-0 h-px" />

      <span className="border-edge absolute top-20 left-6 h-5 w-5 border-t border-l" />
      <span className="border-edge absolute top-20 right-6 h-5 w-5 border-t border-r" />
      <span className="border-edge absolute bottom-6 left-6 h-5 w-5 border-b border-l" />
      <span className="border-edge absolute right-6 bottom-6 h-5 w-5 border-r border-b" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 text-center">
        <SignalLabelRail
          label={t("badge")}
          dotClassName="bg-accent"
          className="mb-8"
          style={{ animation: "fadeUp 0.6s ease both" }}
        />

        <h1
          aria-label={BRAND_NAME}
          className="font-display text-primary mb-6 leading-none font-bold tracking-tight whitespace-nowrap select-none"
          style={{
            fontSize: "clamp(2.5rem, 14vw, 13rem)",
            letterSpacing: "-0.03em",
          }}
        >
          <span className="hero-title">
            <span className="hero-title__mark">
              <LogoD />
            </span>
            <span className="hero-title__word">
              {BRAND_NAME.slice(1).toLocaleUpperCase("cs-CZ")}
            </span>
          </span>
        </h1>

        <p
          className="text-muted mb-12 max-w-xl font-mono text-sm leading-relaxed text-balance md:text-base"
          style={{ animation: "fadeUp 0.7s ease both 0.2s" }}
        >
          {t("taglineLine1")}
          <br />
          {t("taglineLine2")}
        </p>

        <HeroWaveform />

        <div
          className="flex flex-col gap-3 sm:flex-row"
          style={{ animation: "fadeUp 0.7s ease both 0.5s" }}
        >
          <Link
            href={listenEpisodePath(episodeListenPathSegment(latestEpisode))}
            locale={hrefLocale}
            className="premium-cta cta-on-lime rounded-sm px-8 py-3.5 font-mono text-xs font-medium tracking-widest uppercase transition-all duration-200 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
          >
            {t("latestEpisode")}
          </Link>
          <Link
            href={ROUTES.episodes}
            locale={hrefLocale}
            className="border-edge text-muted hover:border-primary/40 hover:text-primary rounded-sm border px-8 py-3.5 font-mono text-xs tracking-widest uppercase transition-all duration-200"
          >
            {t("allEpisodes")}
          </Link>
        </div>
      </div>

      <div className="hidden md:block pointer-events-none absolute top-0 right-0 left-0 z-20 h-[100dvh]">
        <div
          className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 opacity-40"
          style={{ bottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <span className="text-muted font-mono text-xs tracking-widest">{t("scroll")}</span>
          <span
            className="h-8 w-px"
            style={{ background: "linear-gradient(to bottom, var(--muted), transparent)" }}
          />
        </div>
      </div>
    </section>
  );
}
