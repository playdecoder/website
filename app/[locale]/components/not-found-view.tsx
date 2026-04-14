import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { routing } from "@/i18n/routing";
import { ROUTES } from "@/lib/routes";

import { Navbar } from "./layout/navbar";
import { DecoderPageFrame } from "./layout/page-frame";
import { SignalLabelRail } from "./sections/signal-label-rail";

export async function DecoderNotFoundView({ locale = routing.defaultLocale }: { locale?: string }) {
  const t = await getTranslations({ locale, namespace: "notFound" });

  return (
    <div className="page-shell">
      <Navbar locale={locale} />
      <DecoderPageFrame className="items-center justify-center px-5 py-16 text-center">
        <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center">
          <SignalLabelRail
            label={t("signalLost")}
            dotClassName="bg-secondary"
            className="mb-10"
            style={{ animation: "fadeUp 0.55s ease both" }}
          />

          <p
            className="text-secondary/90 mb-4 font-mono text-[10px] tracking-[0.35em] uppercase md:text-xs"
            style={{ animation: "fadeUp 0.55s ease both 0.05s" }}
          >
            {t("errorCode")}
          </p>

          <h1
            className="font-display text-primary mb-2 leading-none font-extrabold tracking-tighter select-none"
            style={{
              fontSize: "clamp(4.5rem, 22vw, 11rem)",
              letterSpacing: "-0.04em",
              animation: "fadeUp 0.6s ease both 0.1s",
            }}
          >
            <span className="inline-block" aria-hidden>
              4
            </span>
            <span
              className="text-secondary relative mx-1 inline-flex items-center justify-center align-middle md:mx-2"
              style={{ fontSize: "0.92em" }}
              aria-hidden
            >
              <span className="relative z-10">0</span>
              <span
                className="border-accent/55 pointer-events-none absolute top-1/2 left-1/2 h-[0.72em] w-[0.72em] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 opacity-80"
                style={{ animation: "fadeIn 1.2s ease both 0.4s" }}
              />
            </span>
            <span className="inline-block" aria-hidden>
              4
            </span>
          </h1>
          <span className="sr-only">{t("srOnly")}</span>

          <p
            className="text-muted mb-10 max-w-sm font-mono text-sm leading-relaxed md:text-base"
            style={{ animation: "fadeUp 0.6s ease both 0.18s" }}
          >
            {t("body")}
          </p>

          <div
            className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row"
            style={{ animation: "fadeUp 0.6s ease both 0.28s" }}
          >
            <Link
              href={ROUTES.home}
              className="cta-on-lime rounded-sm px-8 py-3.5 text-center font-mono text-xs font-medium tracking-widest uppercase transition-all duration-200 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
            >
              {t("backHome")}
            </Link>
            <Link
              href={ROUTES.episodes}
              className="border-edge text-muted hover:border-primary/40 hover:text-primary rounded-sm border px-8 py-3.5 text-center font-mono text-xs tracking-widest uppercase transition-all duration-200"
            >
              {t("latestEpisodes")}
            </Link>
          </div>
        </div>
      </DecoderPageFrame>
    </div>
  );
}
