import Image from "next/image";

import type { Episode } from "@/lib/episode/catalog";
import { artFocalPointToObjectPosition } from "@/lib/episode/art-focal-point";
import { cn } from "@/lib/ui/cn";

export const episodeArtBannerFadeClassName =
  "from-bg pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t to-transparent";

interface EpisodeCoverArtProps {
  episode: Episode;
  className?: string;
  sizes?: string;
}

export function EpisodeCoverArt({ episode, className, sizes }: EpisodeCoverArtProps) {
  if (!episode.artImage) return null;

  return (
    <div className={cn("relative overflow-hidden", className)} aria-hidden>
      <Image
        src={episode.artImage}
        alt=""
        fill
        sizes={sizes ?? "600px"}
        quality={80}
        className="object-cover"
        style={{ objectPosition: artFocalPointToObjectPosition(episode.artFocalPoint) }}
      />
    </div>
  );
}
