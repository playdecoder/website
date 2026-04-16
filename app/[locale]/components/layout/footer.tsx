import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { brandInterpolation } from "@/lib/brand";
import { linkLocale } from "@/lib/link-locale";
import { ROUTES } from "@/lib/routes";

import { LogoD } from "../branding/logo-d";

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "contact" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const b = brandInterpolation(locale);
  const hrefLocale = linkLocale(locale);

  return (
    <footer className="border-edge bg-bg relative z-20 border-t py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5">
        <nav
          aria-label={t("footerNavAria")}
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] tracking-[0.18em] uppercase sm:text-xs"
        >
          <Link
            href={ROUTES.episodes}
            locale={hrefLocale}
            className="text-muted/70 hover:text-primary decoration-from-font underline-offset-[5px] transition-colors hover:underline"
          >
            {tNav("episodes")}
          </Link>
          <span className="text-edge/60" aria-hidden>
            ·
          </span>
          <Link
            href={ROUTES.topics}
            locale={hrefLocale}
            className="text-muted/70 hover:text-primary decoration-from-font underline-offset-[5px] transition-colors hover:underline"
          >
            {tNav("topics")}
          </Link>
          <span className="text-edge/60" aria-hidden>
            ·
          </span>
          <a
            href={ROUTES.rssFeed}
            rel="alternate"
            type="application/rss+xml"
            className="text-muted/70 hover:text-primary decoration-from-font underline-offset-[5px] transition-colors hover:underline"
          >
            {t("platformRss")}
          </a>
        </nav>

        <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <LogoD variant="footer" />
            <span className="text-muted font-mono text-xs tracking-widest">{t("footerBrand", b)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted/50 font-mono text-xs tracking-widest">
              © {new Date().getFullYear()}
            </span>
            <span className="text-edge mx-1">·</span>
            <span className="text-muted/50 font-mono text-xs tracking-widest">
              {t("footerTagline")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
