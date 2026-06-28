import Image from "next/image";

import { artFocalPointToObjectPosition, type ArtFocalPoint } from "@/lib/episode/art-focal-point";

import {
  EPISODE_PLAYER_ART_GRADIENT_FADE_CLASS,
  EPISODE_PLAYER_ART_IMAGE_CLASS,
  EPISODE_PLAYER_ART_INTENSITY_CLASS,
  EPISODE_PLAYER_ART_SIZES,
  EPISODE_PLAYER_ART_WRAPPER_CLASS,
  episodePlayerArtMaskStyle,
} from "./episode-player-art.constants";

interface EpisodePlayerArtBackgroundProps {
  artImage?: string;
  artFocalPoint?: ArtFocalPoint;
  fade?: "gradient" | "mask";
  intensity?: keyof typeof EPISODE_PLAYER_ART_INTENSITY_CLASS;
  /** Request early image load on the listen page first paint. */
  priority?: boolean;
}

export function EpisodePlayerArtBackground({
  artImage,
  artFocalPoint,
  fade = "gradient",
  intensity = "default",
  priority = false,
}: EpisodePlayerArtBackgroundProps) {
  if (!artImage) return null;

  const image = (
    <Image
      src={artImage}
      alt=""
      fill
      sizes={EPISODE_PLAYER_ART_SIZES}
      quality={25}
      priority={priority}
      className={`${EPISODE_PLAYER_ART_IMAGE_CLASS} ${EPISODE_PLAYER_ART_INTENSITY_CLASS[intensity]}`}
      style={{ objectPosition: artFocalPointToObjectPosition(artFocalPoint) }}
    />
  );

  if (fade === "mask") {
    return (
      <div
        className={EPISODE_PLAYER_ART_WRAPPER_CLASS}
        style={episodePlayerArtMaskStyle}
        aria-hidden
      >
        {image}
      </div>
    );
  }

  return (
    <div className={EPISODE_PLAYER_ART_WRAPPER_CLASS} aria-hidden>
      {image}
      <div className={EPISODE_PLAYER_ART_GRADIENT_FADE_CLASS} />
    </div>
  );
}
