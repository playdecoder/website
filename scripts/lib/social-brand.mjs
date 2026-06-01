/** Dekodér brand tokens for social image generation. */

const DARK_BRAND = {
  bg: "#0B0F14",
  surface: "#121821",
  primary: "#E6EDF3",
  muted: "rgba(230, 237, 243, 0.62)",
  secondary: "#5B4DFF",
  accent: "#D4FF3F",
  accentText: "#0B0F14",
  border: "#1F2A38",
};

const LIGHT_BRAND = {
  bg: "#F0F2F5",
  surface: "#E4E8EF",
  primary: "#0B0F14",
  muted: "rgba(11, 15, 20, 0.55)",
  secondary: "#5B4DFF",
  accent: "#D4FF3F",
  accentText: "#0B0F14",
  border: "#C8D3DE",
};

/** Resolve a brand token set from a theme string. */
export function getBrand(theme) {
  return theme === "light" ? LIGHT_BRAND : DARK_BRAND;
}

export const THEMES = /** @type {const} */ (["dark", "light"]);

export const FONTS = {
  display: "Syne",
  mono: "JetBrains Mono",
};

const DEFAULT_LOGO = "public/logo/wide-dark-crop-v4.svg";
const DEFAULT_LOGO_LIGHT = "public/logo/wide-light-crop-v4.svg";

/** Source SVG crop — wordmark only, excludes bottom tagline row. */
export const LOGO_WORDMARK_HEIGHT = 90;

export function getLogoPath(theme) {
  return theme === "light" ? DEFAULT_LOGO_LIGHT : DEFAULT_LOGO;
}
