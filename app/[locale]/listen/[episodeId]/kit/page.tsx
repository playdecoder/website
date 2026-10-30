import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  episodeListenPathSegment,
  listenEpisodes,
  resolveListenEpisodeParam,
} from "@/lib/episode/catalog";
import { listenEpisodeKitPath } from "@/lib/routing/routes";
import { BRAND_NAME } from "@/lib/site/brand";

import { EpisodeKitView } from "./episode-kit-view";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

interface Props {
  params: Promise<{ locale: string; episodeId: string }>;
}

export function generateStaticParams() {
  return listenEpisodes.flatMap((ep) =>
    routing.locales.map((locale) => ({ locale, episodeId: episodeListenPathSegment(ep) })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, episodeId } = await params;
  const t = await getTranslations({ locale, namespace: "kit" });
  const resolved = resolveListenEpisodeParam(episodeId);
  const title = resolved
    ? `${t("metaTitle", { id: resolved.episode.id })} | ${BRAND_NAME}`
    : BRAND_NAME;

  // Unlisted: shared with guests by direct link only.
  return {
    title,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}

export default async function EpisodeKitPage({ params }: Props) {
  const { locale, episodeId } = await params;
  setRequestLocale(locale);

  const resolved = resolveListenEpisodeParam(episodeId);
  if (!resolved) {
    notFound();
  }
  const { episode, canonicalSegment } = resolved;
  if (canonicalSegment !== episodeId.trim()) {
    redirect({ href: listenEpisodeKitPath(canonicalSegment), locale });
  }
  return <EpisodeKitView episode={episode} locale={locale} />;
}
