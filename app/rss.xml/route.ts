import { BRAND_NAME, BRAND_PODCAST } from "@/lib/site/brand";
import {
  episodeListenSlugPrefix,
  episodeOrdinal,
  episodePublishedAtMs,
  episodes,
  formatEpisodePublishedRfc822,
  type Episode,
} from "@/lib/episode/catalog";
import { resolveEpisodeCoverImageUrlForRss } from "@/lib/episode/cover";
import { plainEpisodeDescription } from "@/lib/episode/description";
import { absoluteListenEpisodeUrl } from "@/lib/routing/routes";
import { showHostsAmpersand, showTaglineCs } from "@/lib/site/show";
import { absoluteFromPath, getPodcastCoverAbsoluteUrl, getPublicSiteUrl } from "@/lib/site/urls";
import { SITE_CONTACT_EMAIL } from "@/lib/site/socials";

const SITE_URL = getPublicSiteUrl();
const COVER_ART_URL = getPodcastCoverAbsoluteUrl();

export const dynamic = "force-static";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toItunesDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [hh, mm, ss].map((v) => String(v).padStart(2, "0")).join(":");
}

function estimateMp3Bytes(durationSeconds: number): number {
  return Math.round(durationSeconds * 16_000);
}

function buildItem(ep: Episode): string {
  const epNum = episodeOrdinal(ep);
  const episodePage = absoluteListenEpisodeUrl(SITE_URL, episodeListenSlugPrefix(ep));
  const guid = `dekoder.fm/episodes/${ep.id}`;
  const summary = plainEpisodeDescription(ep.description);

  return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <link>${episodePage}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${formatEpisodePublishedRfc822(ep.date)}</pubDate>
      <description>${escapeXml(summary)}</description>
      <content:encoded><![CDATA[<p>${escapeXml(summary)}</p>]]></content:encoded>
                <enclosure url="${escapeXml(ep.links.mp3.trim().startsWith("/") ? absoluteFromPath(ep.links.mp3.trim()) : ep.links.mp3)}" length="${estimateMp3Bytes(ep.duration)}" type="audio/mpeg" />
      <itunes:title>${escapeXml(ep.title)}</itunes:title>
      <itunes:summary>${escapeXml(summary)}</itunes:summary>
      <itunes:duration>${toItunesDuration(ep.duration)}</itunes:duration>
      <itunes:episode>${epNum}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>${ep.explicit ? "yes" : "no"}</itunes:explicit>
      <itunes:image href="${escapeXml(resolveEpisodeCoverImageUrlForRss(ep))}" />
    </item>`;
}

export function GET() {
  const sorted = episodes.toSorted((a, b) => {
    const byTime = episodePublishedAtMs(b) - episodePublishedAtMs(a);
    return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
  });
  const lastBuildDate = sorted[0]
    ? formatEpisodePublishedRfc822(sorted[0].date)
    : new Date().toUTCString().replace("GMT", "+0000");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:podcast="https://podcastindex.org/namespace/1.0">

  <channel>
    <title>${escapeXml(BRAND_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(showTaglineCs())}</description>
    <language>cs</language>
    <copyright>© ${new Date().getFullYear()} ${escapeXml(BRAND_PODCAST)}</copyright>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <managingEditor>${SITE_CONTACT_EMAIL} (${escapeXml(showHostsAmpersand())})</managingEditor>
    <webMaster>${SITE_CONTACT_EMAIL}</webMaster>
    <ttl>60</ttl>

    <image>
      <url>${COVER_ART_URL}</url>
      <title>${escapeXml(BRAND_NAME)}</title>
      <link>${SITE_URL}</link>
    </image>

    <itunes:author>${escapeXml(showHostsAmpersand())}</itunes:author>
    <itunes:summary>${escapeXml(showTaglineCs())}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:image href="${COVER_ART_URL}" />
    <itunes:category text="Technology" />
    <itunes:category text="Leisure">
      <itunes:category text="Video Games" />
    </itunes:category>
    <itunes:explicit>no</itunes:explicit>
    <itunes:owner>
      <itunes:name>${escapeXml(BRAND_PODCAST)}</itunes:name>
      <itunes:email>${SITE_CONTACT_EMAIL}</itunes:email>
    </itunes:owner>

    ${sorted.map(buildItem).join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
