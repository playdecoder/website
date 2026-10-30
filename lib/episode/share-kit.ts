import socialPostsJson from "@/data/social-posts.json";
import { type Episode, episodePlatformUrl } from "@/lib/episode/catalog";
import { plainEpisodeDescription } from "@/lib/episode/description";
import { episodePublicationTitle } from "@/lib/episode/format";
import { buildEpisodeReviewAssets, type ReviewAsset } from "@/lib/episode/review-assets";
import { LISTEN_PLATFORMS, type ListenPlatform } from "@/lib/routing/routes";
import { socialFrameCdnUrl } from "@/lib/site/urls";
import { LAYOUT_IDS, LAYOUTS } from "@/scripts/lib/social-layouts.mjs";

export type ShareKitLinkKey = "page" | "short" | ListenPlatform;

export interface ShareKitLink {
  key: ShareKitLinkKey;
  /** Our own URL, so it keeps working if the platform link changes. */
  url: string;
  /** The platform's own URL, when it exists (opens the app directly on phones). */
  directUrl?: string;
  /** Platform link not filled in yet, so the short link lands on the episode page for now. */
  pending?: boolean;
}

export type ShareKitTextKey = "post" | "title" | "short" | "long";

export interface ShareKitText {
  key: ShareKitTextKey;
  text: string;
}

export interface EpisodeShareKit {
  links: ShareKitLink[];
  texts: ShareKitText[];
  social: ReviewAsset[];
  covers: ReviewAsset[];
  web: ReviewAsset[];
}

interface SocialPostEntry {
  episodeId: string;
  shortDescription?: string;
  description?: string;
}

const socialPosts = (socialPostsJson as { posts: SocialPostEntry[] }).posts;

/** Social copy written for the frames in `data/social-posts.json`, when there is one. */
function socialShortDescription(episode: Episode): string {
  const entry = socialPosts.find((p) => p.episodeId.toUpperCase() === episode.id.toUpperCase());
  return (entry?.shortDescription ?? entry?.description ?? "").trim();
}

type GeneratedLayout = keyof typeof LAYOUTS;

/**
 * Kit entries in display order (grouped by network). `source` is the generated frame to serve,
 * so a platform with the same spec as another reuses its file instead of a duplicate upload.
 */
const KIT_SOCIAL: ReadonlyArray<{ id: string; source: GeneratedLayout }> = [
  { id: "ig-story", source: "ig-story" },
  { id: "ig-post", source: "ig-post" },
  // Facebook Stories share Instagram's spec: 1080×1920 (9:16).
  { id: "fb-story", source: "ig-story" },
  { id: "facebook-post", source: "facebook-post" },
  { id: "linkedin-post", source: "linkedin-post" },
  { id: "x-post", source: "x-post" },
  { id: "youtube-keyart", source: "youtube-keyart" },
];

/**
 * Everything a guest needs to share an episode: links, ready-to-paste copy, and every social
 * frame plus the covers. Frames that were never uploaded are hidden client-side, so the page
 * picks up a later upload without a rebuild.
 */
export function buildEpisodeShareKit(
  episode: Episode,
  urls: { page: string; short: string; platform: Record<ListenPlatform, string> },
  keyArtSize: { width: number; height: number } | null,
): EpisodeShareKit {
  // Every platform row is always there: the short link works before the platform link exists.
  const platforms = LISTEN_PLATFORMS.map<ShareKitLink>((platform) => {
    const direct = episodePlatformUrl(episode, platform);
    return {
      key: platform,
      url: urls.platform[platform],
      directUrl: direct || undefined,
      pending: !direct,
    };
  });

  const links: ShareKitLink[] = [
    { key: "page", url: urls.page },
    { key: "short", url: urls.short },
    ...platforms,
  ];

  const short = socialShortDescription(episode);
  const long = plainEpisodeDescription(episode.description).trim();
  const texts: ShareKitText[] = [
    { key: "post", text: `${short || long}\n\n${urls.short}` },
    { key: "title", text: episodePublicationTitle(episode) },
    ...(short ? [{ key: "short" as const, text: short }] : []),
    { key: "long", text: long },
  ];

  // Generator layouts not placed above still show up, at the end.
  const entries = [
    ...KIT_SOCIAL,
    ...(LAYOUT_IDS as GeneratedLayout[])
      .filter((id) => !KIT_SOCIAL.some((entry) => entry.id === id))
      .map((id) => ({ id, source: id })),
  ];
  const social = entries.flatMap(({ id, source }) =>
    (["dark", "light"] as const).map<ReviewAsset>((theme) => ({
      key: `${id}-${theme}`,
      layoutId: id,
      theme,
      url: socialFrameCdnUrl(episode.id, source, theme),
      width: LAYOUTS[source].width,
      height: LAYOUTS[source].height,
      usedFor: [],
    })),
  );

  const { covers, web } = buildEpisodeReviewAssets(episode, keyArtSize);
  return { links, texts, social, covers, web };
}
