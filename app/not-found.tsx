import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";

import cs from "@/i18n/cs.json";
import { BRAND_NAME } from "@/lib/brand";

import { DecoderNotFoundView } from "./[locale]/components/not-found-view";

export const dynamic = "force-static";
export const revalidate = false;

export const metadata: Metadata = {
  title: `404 — Stránka nenalezena | ${BRAND_NAME}`,
  description: `Tuto stránku jsme nenašli. Vraťte se na ${BRAND_NAME} — hry, technologie, kontext.`,
};

export default function GlobalNotFound() {
  return (
    <NextIntlClientProvider locale="cs" messages={cs}>
      <DecoderNotFoundView locale="cs" />
    </NextIntlClientProvider>
  );
}
