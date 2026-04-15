"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect } from "react";

import { BRAND_NAME, brandInterpolation } from "@/lib/brand";
import { ROUTES } from "@/lib/routes";
import { linkLocale } from "@/lib/link-locale";

import { DecoderPageFrame } from "./components/layout/page-frame";
import { SignalLabelRail } from "./components/sections/signal-label-rail";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const hrefLocale = linkLocale(locale);
  const t = useTranslations("error");
  const b = brandInterpolation(locale);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-shell">
      <header className="border-edge bg-bg/90 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-3 min-[400px]:px-4 sm:px-5">
          <Link
            href={ROUTES.home}
            locale={hrefLocale}
            className="font-display text-primary text-lg font-extrabold tracking-tight"
            lang={locale}
          >
            {BRAND_NAME}
          </Link>
        </div>
      </header>

      <DecoderPageFrame className="items-center justify-center px-5 py-16 text-center">
        <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center">
          <SignalLabelRail
            label={t("badge")}
            dotClassName="bg-accent"
            className="mb-10"
            style={{ animation: "fadeUp 0.55s ease both" }}
          />

          <h1
            className="font-display text-primary mb-4 max-w-md leading-[1.05] font-bold tracking-tight"
            style={{
              fontSize: "clamp(2rem, 6vw, 3.25rem)",
              animation: "fadeUp 0.6s ease both 0.08s",
              letterSpacing: "-0.03em",
            }}
          >
            {t("heading")}
          </h1>

          <p
            className="text-muted mb-10 max-w-md font-mono text-sm leading-relaxed md:text-base"
            style={{ animation: "fadeUp 0.6s ease both 0.16s" }}
          >
            {t("body")}
          </p>

          <div
            className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row"
            style={{ animation: "fadeUp 0.6s ease both 0.24s" }}
          >
            <button
              type="button"
              onClick={reset}
              className="cta-on-lime cursor-pointer rounded-sm px-8 py-3.5 font-mono text-xs font-medium tracking-widest uppercase transition-all duration-200 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
            >
              {t("tryAgain")}
            </button>
            <Link
              href={ROUTES.home}
              locale={hrefLocale}
              className="border-edge text-muted hover:border-primary/40 hover:text-primary rounded-sm border px-8 py-3.5 text-center font-mono text-xs tracking-widest uppercase transition-all duration-200"
            >
              {t("backHome", b)}
            </Link>
          </div>

          {process.env.NODE_ENV === "development" && error.digest ? (
            <p className="text-muted/70 mt-10 max-w-full font-mono text-[10px] break-all">
              {error.digest}
            </p>
          ) : null}
        </div>
      </DecoderPageFrame>
    </div>
  );
}
