import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const FORMAT_REGISTRY = JSON.parse(
  readFileSync(join(repoRoot, "lib/brand/format-tokens.json"), "utf8"),
);

export const EPISODE_FORMATS = Object.freeze(Object.keys(FORMAT_REGISTRY));
export const EPISODE_FORMAT_LABELS = Object.freeze(
  Object.fromEntries(EPISODE_FORMATS.map((format) => [format, FORMAT_REGISTRY[format].label])),
);
export const SPECIAL_SOCIAL_FORMATS = EPISODE_FORMATS;
export const SOCIAL_FORMATS = Object.freeze(["normal", ...EPISODE_FORMATS]);

/** @param {string} format */
export function isSpecialSocialFormat(format) {
  return EPISODE_FORMATS.includes(format);
}

/** @param {string | undefined} value */
export function normalizeSocialFormat(value) {
  const normalized = (value ?? "normal").toLowerCase();
  if (normalized === "episode") {
    return "normal";
  }
  if (normalized === "normal" || isSpecialSocialFormat(normalized)) {
    return normalized;
  }
  throw new Error(
    `Unknown format "${value}". Use ${SOCIAL_FORMATS.join(", ")}.`,
  );
}

/** @param {string} format @param {"light" | "dark"} theme */
export function getFormatTokens(format, theme) {
  return FORMAT_REGISTRY[format][theme];
}
