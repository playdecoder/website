import { routing } from "@/i18n/routing";

/** Full page navigation with locale cookie (outside React to satisfy the compiler). */
export function navigateToLocale(
  nextLocale: string,
  pathname: string,
  currentLocale: string,
): void {
  if (nextLocale === currentLocale) {
    return;
  }
  document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;SameSite=Lax`;
  const base = nextLocale === routing.defaultLocale ? "" : `/${nextLocale}`;
  window.location.assign(base + pathname);
}
