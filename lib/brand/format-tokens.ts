import tokens from "./format-tokens.json";

export type EpisodeFormat = keyof typeof tokens;
export type BrandTheme = "light" | "dark";

export type FormatThemeTokens = {
  color: string;
  text: string;
  glow: string;
};

export type FormatRegistryEntry = {
  label: string;
  light: FormatThemeTokens;
  dark: FormatThemeTokens;
};

/** Canonical episode format registry — colors, labels, and theme tokens. */
export const FORMAT_REGISTRY = tokens as Record<EpisodeFormat, FormatRegistryEntry>;

export const EPISODE_FORMATS = Object.keys(tokens) as EpisodeFormat[];

export const EPISODE_FORMAT_LABELS = Object.fromEntries(
  EPISODE_FORMATS.map((format) => [format, tokens[format].label]),
) as Record<EpisodeFormat, string>;

export const SPECIAL_SOCIAL_FORMATS = EPISODE_FORMATS;
export const SOCIAL_FORMATS = ["normal", ...EPISODE_FORMATS] as const;
export type SocialFormat = (typeof SOCIAL_FORMATS)[number];

export function isSpecialSocialFormat(format: string): format is EpisodeFormat {
  return (EPISODE_FORMATS as readonly string[]).includes(format);
}

export function getFormatTokens(format: EpisodeFormat, theme: BrandTheme): FormatThemeTokens {
  return FORMAT_REGISTRY[format][theme];
}
