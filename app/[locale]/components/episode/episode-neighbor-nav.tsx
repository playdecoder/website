import Link from "next/link";

import { episodeListenPathSegment, type Episode } from "@/lib/episode-catalog";
import { listenEpisodePath } from "@/lib/routes";

interface NeighborLabels {
  newer: string;
  older: string;
  newestEpisodeStub: string;
  debutEpisodeStub: string;
}

interface EpisodeNeighborNavProps {
  newer?: Episode;
  older?: Episode;
  labels: NeighborLabels;
}

const cardLink =
  "block rounded-sm border border-edge p-4 sm:p-5 min-h-[5.5rem] hover:border-secondary/50 hover:bg-surface/40 active:bg-surface-2 transition-all duration-200 group";
const cardStub =
  "rounded-sm border border-dashed border-edge/70 p-4 sm:p-5 flex items-center min-h-[5.5rem]";
const labelClass =
  "font-mono text-[10px] tracking-[0.25em] text-muted uppercase block mb-2 group-hover:text-accent-text transition-colors";
const titleClass =
  "font-display font-semibold text-primary text-base sm:text-lg leading-snug group-hover:text-secondary transition-colors text-pretty";
const idClass = "font-mono text-xs text-muted tracking-widest mt-2 block";

export function EpisodeNeighborNav({ newer, older, labels }: EpisodeNeighborNavProps) {
  return (
    <div
      className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 sm:gap-4"
      style={{ animation: "fadeUp 0.65s ease both 0.28s" }}
    >
      {newer ? (
        <Link href={listenEpisodePath(episodeListenPathSegment(newer))} className={cardLink}>
          <span className={labelClass}>{labels.newer}</span>
          <span className={titleClass}>{newer.title}</span>
          <span className={idClass}>{newer.id}</span>
        </Link>
      ) : (
        <div className={cardStub}>
          <span className="text-muted font-mono text-[11px] tracking-widest text-pretty uppercase sm:text-xs">
            {labels.newestEpisodeStub}
          </span>
        </div>
      )}

      {older ? (
        <Link
          href={listenEpisodePath(episodeListenPathSegment(older))}
          className={`${cardLink} sm:text-right`}
        >
          <span className={labelClass}>{labels.older}</span>
          <span className={titleClass}>{older.title}</span>
          <span className={idClass}>{older.id}</span>
        </Link>
      ) : (
        <div className={`${cardStub} sm:justify-end`}>
          <span className="text-muted font-mono text-[11px] tracking-widest uppercase sm:text-xs">
            {labels.debutEpisodeStub}
          </span>
        </div>
      )}
    </div>
  );
}
