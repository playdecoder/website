import { getTranslations } from "next-intl/server";

import { brandInterpolation } from "@/lib/brand";

import { DecoderLogoPair } from "../branding/logo-pair";

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "contact" });
  const b = brandInterpolation(locale);

  return (
    <footer className="border-edge bg-bg relative z-20 border-t py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <DecoderLogoPair />
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
    </footer>
  );
}
