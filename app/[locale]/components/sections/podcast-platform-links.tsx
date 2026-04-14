import { cn } from "@/lib/cn";
import type { EpisodeLinks } from "@/lib/episode-catalog";
import {
  EPISODE_LISTEN_PLATFORM_KEYS,
  PODCAST_PLATFORM_KEYS,
  type EpisodeListenPlatformKey,
  type PodcastPlatformKey,
} from "@/lib/podcast-ui";
import { ROUTES } from "@/lib/routes";

const PODCAST_PLATFORM_HREF: Record<PodcastPlatformKey, string> = {
  platformSpotify: "#",
  platformApple: "#",
  platformYoutube: "#",
  platformRss: ROUTES.rssFeed,
};

type Variant = "contact" | "episode";

const linkClass: Record<Variant, string> = {
  contact:
    "platform-link group flex items-center gap-2 px-5 py-2.5 border border-edge hover:border-primary/30 text-muted hover:text-primary font-mono text-xs tracking-widest uppercase rounded-sm transition-all duration-200",
  episode:
    "platform-link group/p flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 border border-edge hover:border-primary/30 active:bg-surface-2 text-muted hover:text-primary font-mono text-[10px] md:text-xs tracking-widest uppercase rounded-sm transition-all duration-200 sm:justify-start",
};

/** De-emphasized chips for secondary placement (e.g. off-site platforms below primary content). */
const episodeLinkQuiet =
  "platform-link group/p flex min-h-9 items-center justify-center gap-1.5 border border-edge/20 px-3 py-1.5 text-muted/60 hover:border-edge/35 hover:bg-surface/20 hover:text-muted/85 active:bg-surface/30 dark:border-edge/25 dark:text-muted/55 dark:hover:border-edge/40 dark:hover:text-muted/80 font-mono text-[9px] tracking-[0.18em] uppercase rounded-sm transition-colors duration-200 sm:min-h-10 sm:justify-start sm:px-3.5 sm:py-2 sm:text-[10px] sm:tracking-widest md:text-[11px]";

const pulseClass: Record<Variant, string> = {
  contact:
    "platform-link__dot w-1.5 h-1.5 rounded-full bg-secondary group-hover:bg-accent transition-colors",
  episode:
    "platform-link__dot w-1.5 h-1.5 rounded-full bg-secondary group-hover/p:bg-accent transition-colors",
};

const episodePulseQuiet =
  "platform-link__dot mt-px w-1 h-1 shrink-0 rounded-full bg-edge/45 group-hover/p:bg-edge/65 transition-colors";

interface PodcastPlatformLinksProps {
  variant: Variant;
  getLabel: (key: PodcastPlatformKey) => string;
  className?: string;
}

export function PodcastPlatformLinks({ variant, getLabel, className }: PodcastPlatformLinksProps) {
  const wrapper =
    variant === "contact"
      ? cn("flex flex-wrap items-center justify-center gap-3 mb-12", className)
      : cn("contents", className);

  return (
    <div className={wrapper}>
      {PODCAST_PLATFORM_KEYS.map((key) => (
        <a key={key} href={PODCAST_PLATFORM_HREF[key]} className={linkClass[variant]}>
          <span className={pulseClass[variant]} />
          {getLabel(key)}
        </a>
      ))}
    </div>
  );
}

const episodeHrefByKey = (links: EpisodeLinks): Record<EpisodeListenPlatformKey, string> => ({
  platformSpotify: links.spotify,
  platformApple: links.applePodcasts,
  platformYoutube: links.youtube,
  platformMp3: links.mp3,
});

interface EpisodeListenPlatformLinksProps {
  links: EpisodeLinks;
  getLabel: (key: EpisodeListenPlatformKey) => string;
  className?: string;
  /** Softer visual weight — avoids competing with primary on-page content. */
  tone?: "default" | "quiet";
}

export function EpisodeListenPlatformLinks({
  links,
  getLabel,
  className,
  tone = "default",
}: EpisodeListenPlatformLinksProps) {
  const hrefs = episodeHrefByKey(links);
  const linkCn = tone === "quiet" ? episodeLinkQuiet : linkClass.episode;
  const dotCn = tone === "quiet" ? episodePulseQuiet : pulseClass.episode;
  return (
    <div className={cn("contents", className)}>
      {EPISODE_LISTEN_PLATFORM_KEYS.map((key) => (
        <a key={key} href={hrefs[key]} target="_blank" rel="noopener noreferrer" className={linkCn}>
          <span className={dotCn} />
          {getLabel(key)}
        </a>
      ))}
    </div>
  );
}
