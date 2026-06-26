/** Episode art already blurs the right half; the mini player adds one full-width glass topcoat to avoid a split plate. */
export function episodeHasPlayerArt(artImage?: string): boolean {
  return Boolean(artImage);
}

export const PLAYER_ART_SHELL_CLASS = {
  audio: {
    section: "bg-surface/88 dark:bg-surface/58",
    sectionLoadError: "bg-surface/91 dark:bg-surface/62",
    frost:
      "pointer-events-none absolute inset-y-0 left-0 z-0 w-[52%] bg-surface/40 backdrop-blur-md dark:bg-surface/28",
  },
  mini: {
    section:
      "bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] backdrop-blur-3xl backdrop-brightness-[1.04] backdrop-contrast-[1.04] backdrop-saturate-200 dark:bg-[color-mix(in_srgb,var(--surface)_52%,transparent)] dark:backdrop-brightness-[1.08] dark:backdrop-contrast-[1.03]",
    frost:
      "pointer-events-none absolute inset-0 z-0 bg-[color-mix(in_srgb,var(--surface)_18%,transparent)] backdrop-blur-xl dark:bg-[color-mix(in_srgb,var(--surface)_16%,transparent)]",
  },
} as const;

export const episodePlayerArtMaskStyle = {
  maskImage: "linear-gradient(to right, transparent, black 55%)",
  WebkitMaskImage: "linear-gradient(to right, transparent, black 55%)",
} as const;

export const EPISODE_PLAYER_ART_IMAGE_CLASS =
  "scale-[1.08] object-cover object-center blur-[28px] saturate-[0.75]";

export const EPISODE_PLAYER_ART_WRAPPER_CLASS =
  "pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2 overflow-hidden isolation-isolate";

export const EPISODE_PLAYER_ART_GRADIENT_FADE_CLASS =
  "absolute inset-0 bg-gradient-to-r from-surface via-surface/55 to-surface/10 dark:from-surface dark:via-surface/60 dark:to-surface/15";

export const EPISODE_PLAYER_ART_INTENSITY_CLASS = {
  default: "opacity-[0.52] dark:opacity-[0.30]",
  subtle: "opacity-[0.42] dark:opacity-[0.24]",
} as const;

export const EPISODE_PLAYER_ART_SIZES = "(max-width: 640px) 50vw, 440px";
