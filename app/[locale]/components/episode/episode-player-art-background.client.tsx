"use client";

import Image from "next/image";

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
  fade?: "gradient" | "mask";
  intensity?: keyof typeof EPISODE_PLAYER_ART_INTENSITY_CLASS;
}

export function EpisodePlayerArtBackground({
  artImage,
  fade = "gradient",
  intensity = "default",
}: EpisodePlayerArtBackgroundProps) {
  if (!artImage) return null;

  const image = (
    <Image
      src={artImage}
      alt=""
      fill
      sizes={EPISODE_PLAYER_ART_SIZES}
      quality={25}
      className={`${EPISODE_PLAYER_ART_IMAGE_CLASS} ${EPISODE_PLAYER_ART_INTENSITY_CLASS[intensity]}`}
    />
  );

  if (fade === "mask") {
    return (
      <div className={EPISODE_PLAYER_ART_WRAPPER_CLASS} style={episodePlayerArtMaskStyle} aria-hidden>
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
