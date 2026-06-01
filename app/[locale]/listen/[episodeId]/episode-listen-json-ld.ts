import { BRAND_NAME } from "@/lib/site/brand";
import {
  type Episode,
  formatEpisodeDurationIso8601,
  formatEpisodePublishedIso,
} from "@/lib/episode/catalog";
import { plainEpisodeDescription } from "@/lib/episode/description";
import { showHostsSchemaPersons } from "@/lib/site/show";

import { isHttpUrl, trimEpisodeHosts } from "./episode-listen-helpers";

export function buildEpisodeListenJsonLd(
  episode: Episode,
  canonicalUrl: string,
  episodeCoverUrl: string,
  seriesCoverUrl: string,
  seriesUrl: string,
) {
  const descriptionPlain = plainEpisodeDescription(episode.description);
  const displayHosts = trimEpisodeHosts(episode);
  const episodeContributors = displayHosts.flatMap((h) =>
    isHttpUrl(h.link)
      ? [{ "@type": "Person" as const, name: h.fullName, url: h.link }]
      : [],
  );

  return {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    "@id": `${canonicalUrl}#episode`,
    url: canonicalUrl,
    name: `${episode.id} — ${episode.title}`,
    headline: episode.title,
    description: descriptionPlain,
    datePublished: formatEpisodePublishedIso(episode.date),
    duration: formatEpisodeDurationIso8601(episode.duration),
    inLanguage: episode.lang,
    image: episodeCoverUrl,
    author: showHostsSchemaPersons(),
    ...(episodeContributors.length > 0 ? { contributor: episodeContributors } : {}),
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: episode.links.mp3,
      encodingFormat: "audio/mpeg",
    },
    partOfSeries: {
      "@type": "PodcastSeries",
      name: BRAND_NAME,
      url: seriesUrl,
      image: seriesCoverUrl,
    },
  };
}
