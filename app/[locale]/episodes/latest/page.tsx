import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  episodeListenPathSegment,
  episodes,
  getLatestEpisode,
} from "@/lib/episode/catalog";
import { listenEpisodePath } from "@/lib/routing/routes";

export const dynamic = "force-static";
export const revalidate = false;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const latest = getLatestEpisode(episodes);
  if (!latest) {
    return { title: "Latest episode" };
  }
  return {
    title: `${latest.id} — ${latest.title}`,
    robots: { index: false, follow: true },
  };
}

export default async function LatestEpisodeRedirectPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const latest = getLatestEpisode(episodes);
  if (!latest) {
    notFound();
  }

  redirect({ href: listenEpisodePath(episodeListenPathSegment(latest)), locale });
}
