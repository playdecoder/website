import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { episodes, episodeListenPathSegment } from "@/lib/episode-catalog";
import { getTopicEntries } from "@/lib/episode-topics";
import { listenEpisodePath, ROUTES, topicPath } from "@/lib/routes";
import { absoluteFromPath, getPublicSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteUrl();
  const out: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    out.push({
      url: absoluteFromPath(getPathname({ locale, href: ROUTES.home })),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: locale === routing.defaultLocale ? 1 : 0.9,
    });

    out.push({
      url: absoluteFromPath(getPathname({ locale, href: ROUTES.episodes })),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    });

    for (const topic of getTopicEntries(episodes)) {
      out.push({
        url: absoluteFromPath(getPathname({ locale, href: topicPath(topic.slug) })),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.72,
      });
    }

    for (const ep of episodes) {
      const listenHref = listenEpisodePath(episodeListenPathSegment(ep));
      out.push({
        url: absoluteFromPath(getPathname({ locale, href: listenHref })),
        lastModified: new Date(`${ep.date}T12:00:00.000Z`),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  out.push({
    url: `${base}/rss.xml`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.65,
  });

  return out;
}
