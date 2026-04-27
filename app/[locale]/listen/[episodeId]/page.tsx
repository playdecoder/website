import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import episodesData from "@/data/episodes.json";
import { getPathname, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { BRAND_NAME, BRAND_PODCAST, brandInterpolation } from "@/lib/brand";
import {
  episodeListenPathSegment,
  episodeListenSlugPrefix,
  resolveListenEpisodeParam,
  type Episode,
} from "@/lib/episode-catalog";
import { resolveEpisodeCoverForMeta } from "@/lib/episode-cover";
import { plainEpisodeDescription } from "@/lib/episode-description";
import { listenEpisodePath } from "@/lib/routes";
import { showHostsForMetadata, showHostsForOpenGraphArticle } from "@/lib/show";
import { absoluteFromPath } from "@/lib/site";

import { EpisodeListenView } from "./episode-listen-view";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

interface Props {
  params: Promise<{ locale: string; episodeId: string }>;
}

export function generateStaticParams() {
  const eps = episodesData as Episode[];
  return eps.flatMap((ep) => {
    const canonical = episodeListenPathSegment(ep);
    const short = episodeListenSlugPrefix(ep);
    return routing.locales.flatMap((locale) => [
      { locale, episodeId: canonical },
      { locale, episodeId: short },
    ]);
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, episodeId } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const b = brandInterpolation(locale);
  const resolved = resolveListenEpisodeParam(episodeId);
  if (!resolved) {
    return { title: t("episodeFallbackTitle", b) };
  }
  const { episode, canonicalSegment } = resolved;
  const listenHref = listenEpisodePath(canonicalSegment);
  const pathnameFor = (loc: string) => getPathname({ locale: loc, href: listenHref });
  const canonicalUrl = absoluteFromPath(pathnameFor(locale));
  const publishedTime = `${episode.date}T12:00:00.000Z`;
  const cover = resolveEpisodeCoverForMeta(episode);

  const languages: Record<string, string> = {
    cs: absoluteFromPath(pathnameFor("cs")),
    en: absoluteFromPath(pathnameFor("en")),
    "x-default": absoluteFromPath(pathnameFor(routing.defaultLocale)),
  };

  const ogLocale = locale === "cs" ? "cs_CZ" : "en_US";
  const ogAlternateLocales = locale === "cs" ? ["en_US"] : ["cs_CZ"];

  const pageTitle = `${episode.id} — ${episode.title} | ${BRAND_NAME}`;
  const ogTitle = `${episode.id} — ${episode.title}`;
  const description = plainEpisodeDescription(episode.description);
  const imageAlt = `${episode.id} — ${episode.title} — ${BRAND_NAME}`;

  return {
    title: pageTitle,
    description,
    applicationName: BRAND_NAME,
    authors: showHostsForMetadata(),
    creator: BRAND_PODCAST,
    publisher: BRAND_PODCAST,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    keywords: [...episode.tags, "podcast", BRAND_NAME],
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      type: "article",
      title: ogTitle,
      description,
      url: canonicalUrl,
      siteName: BRAND_NAME,
      locale: ogLocale,
      alternateLocale: ogAlternateLocales,
      publishedTime,
      modifiedTime: publishedTime,
      authors: showHostsForOpenGraphArticle(),
      section: "Podcast",
      tags: episode.tags,
      images: [
        {
          url: cover.url,
          secureUrl: cover.url,
          alt: imageAlt,
          type: cover.type,
        },
      ],
      audio: [{ url: episode.links.mp3, type: "audio/mpeg" }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: {
        url: cover.url,
        alt: imageAlt,
      },
    },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}

export default async function ListenEpisodePage({ params }: Props) {
  const { locale, episodeId } = await params;
  setRequestLocale(locale);

  const resolved = resolveListenEpisodeParam(episodeId);
  if (!resolved) {
    notFound();
  }
  const { episode, canonicalSegment } = resolved;
  if (canonicalSegment !== episodeId.trim()) {
    redirect({ href: listenEpisodePath(canonicalSegment), locale });
  }
  return <EpisodeListenView episode={episode} locale={locale} />;
}
