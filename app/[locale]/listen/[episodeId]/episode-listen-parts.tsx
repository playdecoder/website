import type { Episode, EpisodeHost } from "@/lib/episode/catalog";
import { formatEpisodeDate, formatEpisodeDuration } from "@/lib/episode/catalog";

import { EpisodeShareButton } from "../../components/episode/episode-share-button";
import { TopicLinkChip } from "../../components/episode/topic-link-chip";
import {
  IconEpisodeAirDate,
  IconEpisodeDuration,
  IconExternalLink,
  IconLatestDrop,
} from "../../components/ui/icons";
import { BarMotif } from "../../components/ui/bar-motif";

import { episodeAirDateSpine, hostInitials, isHttpUrl } from "./episode-listen-helpers";

function LatestDropBadge({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={`cta-on-lime inline-flex w-fit items-center gap-2 rounded-sm px-3 py-1.5 font-mono text-[10px] font-medium tracking-widest uppercase md:text-xs${className ? ` ${className}` : ""}`}
    >
      <IconLatestDrop
        size={15}
        className="[animation:latestDropPing_1.8s_ease-in-out_infinite] opacity-95"
      />
      {label}
    </div>
  );
}

export function EpisodeListenHosts({
  hosts,
  heading,
  profileAria,
  stagger,
}: {
  hosts: EpisodeHost[];
  heading: string;
  profileAria: (name: string) => string;
  stagger: (i: number) => string;
}) {
  if (hosts.length === 0) {
    return null;
  }

  return (
    <section
      className="border-edge/20 from-surface-2/40 text-primary rounded-sm border bg-gradient-to-br to-transparent px-3 py-2.5 sm:px-3.5 sm:py-3"
      style={{ animation: "fadeUp 0.62s ease both 0.12s" }}
      aria-label={heading}
    >
      <h2 className="text-muted mb-2 font-mono text-[9px] tracking-[0.22em] uppercase sm:text-[10px] sm:tracking-[0.26em]">
        {heading}
      </h2>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2.5">
        {hosts.map((host, i) => {
          const hrefOk = isHttpUrl(host.link);
          const delay = stagger(i + 2);
          return (
            <li
              key={`${host.fullName}-${host.link}`}
              className="min-w-0 sm:max-w-xs"
              style={{ animation: `fadeUp 0.55s ease both ${delay}` }}
            >
              <div className="border-edge/30 bg-surface/60 hover:border-accent-text/35 group flex min-h-10 items-center gap-2 rounded-sm border px-2 py-1.5 transition-[border-color,background-color] duration-200 sm:min-h-9 sm:py-1.5">
                <span
                  className="font-display text-accent-text bg-surface-2/80 border-edge/40 flex size-8 shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none font-bold tracking-tight"
                  aria-hidden
                >
                  {hostInitials(host.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  {hrefOk ? (
                    <a
                      href={host.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display text-primary group-hover:text-accent-text inline-flex min-h-10 w-full items-center gap-1 text-sm font-semibold tracking-tight transition-colors sm:min-h-9"
                      aria-label={profileAria(host.fullName)}
                    >
                      <span className="truncate">{host.fullName}</span>
                      <IconExternalLink
                        size={12}
                        className="text-secondary/55 group-hover:text-accent-text shrink-0 transition-colors"
                      />
                    </a>
                  ) : (
                    <span className="font-display text-primary block truncate text-sm font-semibold tracking-tight">
                      {host.fullName}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function EpisodeListenTags({
  tags,
  locale,
  stagger,
}: {
  tags: string[];
  locale: string;
  stagger: (i: number) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {tags.map((tag, i) => (
        <span key={tag} className="inline-flex" style={{ animationDelay: stagger(i) }}>
          <TopicLinkChip tag={tag} locale={locale} />
        </span>
      ))}
    </div>
  );
}

export type EpisodeListenMetaLabels = {
  shareLabel: string;
  shareAria: string;
  copyLabel: string;
  copyLabelCompact: string;
  copyAria: string;
  copiedLabel: string;
  copyFailedLabel: string;
};

export function EpisodeListenMetadata({
  episode,
  locale,
  shareLabel,
  shareAria,
  copyLabel,
  copyLabelCompact,
  copyAria,
  copiedLabel,
  copyFailedLabel,
}: EpisodeListenMetaLabels & { episode: Episode; locale: string }) {
  return (
    <div
      className="text-muted flex flex-col gap-3 font-mono text-[11px] tracking-widest sm:text-xs md:flex-row md:flex-wrap md:items-center md:gap-x-6"
      style={{ animation: "fadeUp 0.6s ease both 0.14s" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex min-w-0 items-center gap-2">
          <IconEpisodeAirDate size={13} className="text-secondary/65 shrink-0" />
          <span className="break-words">{formatEpisodeDate(episode.date, locale)}</span>
        </span>
        <span className="text-edge/80 shrink-0 select-none" aria-hidden>
          ·
        </span>
        <span className="inline-flex items-center gap-2">
          <IconEpisodeDuration size={13} className="text-secondary/65 shrink-0" />
          {formatEpisodeDuration(episode.duration)}
        </span>
      </div>
      <EpisodeShareButton
        shareTitle={`${episode.id} — ${episode.title}`}
        shareText={episode.description}
        label={shareLabel}
        labelAria={shareAria}
        copyLabel={copyLabel}
        copyLabelCompact={copyLabelCompact}
        copyAria={copyAria}
        copiedLabel={copiedLabel}
        copyFailedLabel={copyFailedLabel}
        className="w-full md:ml-auto md:w-auto md:shrink-0"
      />
    </div>
  );
}

export function EpisodeListenDesktopSidebar({
  episode,
  locale,
  isLatest,
  onTheWireLabel,
  latestDropLabel,
}: {
  episode: Episode;
  locale: string;
  isLatest: boolean;
  onTheWireLabel: string;
  latestDropLabel: string;
}) {
  return (
    <div
      className="hidden lg:col-span-4 lg:flex lg:flex-col lg:gap-8"
      style={{ animation: "fadeUp 0.65s ease both 0.05s" }}
    >
      <div className="flex items-center gap-3 sm:gap-4 lg:flex-col lg:items-start lg:gap-4">
        <BarMotif size={1} />
        <div className="flex flex-col gap-3">
          <span className="text-muted font-mono text-xs tracking-[0.25em] uppercase">
            {onTheWireLabel}
          </span>
          <div className="flex flex-col items-start gap-3">
            <span
              className="text-secondary font-mono text-sm font-medium tracking-[0.35em] md:text-base"
              style={{ animation: "fadeUp 0.6s ease both 0.12s" }}
            >
              {episode.id}
            </span>
            {isLatest ? (
              <LatestDropBadge
                label={latestDropLabel}
                className="[animation:fadeUp_0.6s_ease_both_0.18s]"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="text-edge/25 dark:text-edge/[0.12] hidden font-mono leading-[0.85] font-bold tracking-tight select-none lg:flex"
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: "clamp(3rem, 8vw, 6.5rem)",
          animation: "fadeUp 0.75s ease both 0.15s",
        }}
        aria-hidden
      >
        {episodeAirDateSpine(episode.date, locale)}
      </div>
    </div>
  );
}

export function EpisodeListenMobileHeader({
  episode,
  isLatest,
  onTheWireLabel,
  latestDropLabel,
}: {
  episode: Episode;
  isLatest: boolean;
  onTheWireLabel: string;
  latestDropLabel: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 lg:hidden"
      style={{ animation: "fadeUp 0.65s ease both 0.05s" }}
    >
      <div className="flex items-center gap-3">
        <BarMotif size={1} />
        <div className="flex flex-col gap-0.5">
          <span className="text-muted font-mono text-[10px] tracking-[0.25em] uppercase">
            {onTheWireLabel}
          </span>
          <span className="text-secondary font-mono text-sm font-medium tracking-[0.35em]">
            {episode.id}
          </span>
        </div>
      </div>
      {isLatest ? <LatestDropBadge label={latestDropLabel} /> : null}
    </div>
  );
}
