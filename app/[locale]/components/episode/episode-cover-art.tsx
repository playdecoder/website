import Image from "next/image";

import type { Episode } from "@/lib/episode-catalog";
import { cn } from "@/lib/cn";

export const episodeArtBannerFadeClassName =
  "from-bg pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t to-transparent";

interface EpisodeCoverArtProps {
  episode: Episode;
  className?: string;
  sizes?: string;
  /** `banner`: sharp card header art. `wash`: blurred full-bleed listen-page background. */
  variant?: "banner" | "wash";
}

export function EpisodeCoverArt({
  episode,
  className,
  sizes,
  variant = "banner",
}: EpisodeCoverArtProps) {
  if (!episode.artImage) return null;

  const isWash = variant === "wash";

  return (
    <div
      className={cn(
        isWash
          ? "pointer-events-none absolute inset-0 z-0 overflow-hidden"
          : "relative overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <Image
        src={episode.artImage}
        alt=""
        fill
        sizes={sizes ?? (isWash ? "480px" : "600px")}
        quality={isWash ? 25 : 80}
        className={
          isWash
            ? "scale-110 object-cover object-top opacity-[0.18] blur-3xl dark:opacity-[0.1]"
            : "object-cover object-center"
        }
      />
    </div>
  );
}
