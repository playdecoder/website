import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { episodes, episodeListenPathSegment, getLatestEpisode } from "@/lib/episode/catalog";
import { linkLocale } from "@/lib/routing/link-locale";
import { ROUTES, homeSectionPath, listenEpisodePath } from "@/lib/routing/routes";
import { BRAND_NAME } from "@/lib/site/brand";

import { LangSwitcher } from "../../lang-switcher";
import { ThemeToggle } from "../../theme-toggle";

import { MobileNavTray } from "./mobile-nav-tray";
import { NavAutoHide } from "./nav-auto-hide";

type NavLogo = {
  src: string;
  width: number;
  height: number;
  className: string;
  loading?: "eager";
};

/* Square mark on compact widths and in the side rail; wide wordmark on the top bar from md. */
const NAV_MARK_LOGOS: NavLogo[] = [
  {
    src: "/icon.svg",
    width: 128,
    height: 128,
    className: "block dark:hidden h-11 w-11 short:size-10 object-contain",
  },
  {
    src: "/icon-dark.svg",
    width: 128,
    height: 128,
    className: "hidden dark:block h-11 w-11 short:size-10 object-contain",
  },
];

const NAV_WIDE_LOGOS: NavLogo[] = [
  {
    src: "/logo/wide-light-crop-v4.svg",
    width: 359,
    height: 113,
    className: "block dark:hidden h-11 w-auto max-h-11 short:h-10 object-contain object-left",
    loading: "eager",
  },
  {
    src: "/logo/wide-dark-crop-v4.svg",
    width: 359,
    height: 113,
    className: "hidden dark:block h-11 w-auto max-h-11 short:h-10 object-contain object-left",
  },
];

function NavLogoImages({ logos }: { logos: NavLogo[] }) {
  return logos.map((logo) => (
    <Image
      key={logo.src}
      src={logo.src}
      alt={BRAND_NAME}
      width={logo.width}
      height={logo.height}
      className={logo.className}
      loading={logo.loading}
    />
  ));
}

export async function Navbar({ locale = routing.defaultLocale }: { locale?: string }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const latest = getLatestEpisode(episodes);
  const hrefLocale = linkLocale(locale);
  const latestEpisodePath = latest
    ? listenEpisodePath(episodeListenPathSegment(latest))
    : ROUTES.episodes;

  return (
    <header className="site-header border-edge bg-bg/90 rail:right-auto rail:bottom-0 rail:w-[var(--rail-w)] rail:border-r rail:border-b-0 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md transition-[color,background-color,border-color,transform] duration-250">
      <NavAutoHide />
      <nav className="short:h-14 rail:h-full rail:flex-col rail:justify-start rail:gap-3 rail:px-0 rail:py-3 mx-auto flex h-16 max-w-6xl min-w-0 items-center justify-between gap-2 px-3 min-[400px]:px-4 sm:gap-4 sm:px-5">
        <Link href={ROUTES.home} locale={hrefLocale} className="flex shrink-0 items-center">
          <span className="rail:block block md:hidden">
            <NavLogoImages logos={NAV_MARK_LOGOS} />
          </span>
          <span className="rail:hidden hidden md:block">
            <NavLogoImages logos={NAV_WIDE_LOGOS} />
          </span>
        </Link>

        <div className="text-muted rail:hidden hidden items-center gap-7 font-mono text-xs tracking-widest uppercase lg:flex">
          <Link
            href={homeSectionPath("about")}
            locale={hrefLocale}
            className="hover-underline hover:text-primary transition-colors"
          >
            {t("about")}
          </Link>
          <Link
            href={homeSectionPath("hosts")}
            locale={hrefLocale}
            className="hover-underline hover:text-primary transition-colors"
          >
            {t("hosts")}
          </Link>
          <Link
            href={ROUTES.episodes}
            locale={hrefLocale}
            className="hover-underline hover:text-primary transition-colors"
          >
            {t("episodes")}
          </Link>
          <Link
            href={ROUTES.topics}
            locale={hrefLocale}
            className="hover-underline hover:text-primary transition-colors"
          >
            {t("topics")}
          </Link>
          <Link
            href={homeSectionPath("contact")}
            locale={hrefLocale}
            className="hover-underline hover:text-primary transition-colors"
          >
            {t("contact")}
          </Link>
        </div>

        <div className="rail:h-auto rail:flex-1 rail:flex-col rail:gap-2 flex h-10 shrink-0 items-center gap-1.5 sm:gap-2">
          <MobileNavTray
            locale={hrefLocale}
            items={[
              { href: ROUTES.home, label: t("home") },
              { href: homeSectionPath("about"), label: t("about") },
              { href: homeSectionPath("hosts"), label: t("hosts") },
              { href: ROUTES.episodes, label: t("episodes") },
              { href: ROUTES.topics, label: t("topics") },
              { href: homeSectionPath("contact"), label: t("contact") },
            ]}
            listenHref={latestEpisodePath}
            listenLabel={t("listenNow")}
            openNavigationAria={t("openNavigation")}
            closeNavigationAria={t("closeNavigation")}
          />
          {/* Settings sit at the foot of the rail, away from navigation and the primary action. */}
          <div className="rail:mt-auto rail:flex-col rail:gap-2 flex items-center gap-1.5 sm:gap-2">
            <LangSwitcher />
            <ThemeToggle />
          </div>
          <span className="nav-cta-glow-wrap nav-cta-glow-wrap--header rail:order-first rail:h-auto inline-flex h-10 items-center">
            <Link
              href={latestEpisodePath}
              locale={hrefLocale}
              className="premium-cta cta-on-lime rail:size-11 rail:px-0 relative z-[1] inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 font-mono text-[10px] font-medium tracking-widest whitespace-nowrap uppercase shadow-[inset_0_1px_0_rgb(255_255_255/0.38),0_4px_14px_-4px_var(--accent)] transition-all duration-200 hover:scale-[1.02] hover:opacity-95 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_6px_22px_-6px_var(--accent)] focus-visible:ring-2 focus-visible:ring-[#0b0f14]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--accent)] focus-visible:outline-none active:scale-[0.98] min-[400px]:px-4 min-[400px]:text-xs sm:gap-2.5 sm:px-5 sm:text-xs"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-[14px] shrink-0 translate-x-px sm:size-4"
                aria-hidden
              >
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
              <span className="rail:hidden hidden sm:inline">{t("listenNow")}</span>
              <span className="rail:inline sr-only sm:hidden">{t("listenNow")}</span>
            </Link>
          </span>
        </div>
      </nav>
    </header>
  );
}
