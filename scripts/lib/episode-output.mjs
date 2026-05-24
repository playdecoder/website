import { join } from "node:path";

export const OUTPUT_ROOT = "output";

/** Lowercase episode folder: EP02 → ep02 */
export function episodeOutputDir(episodeId) {
  return `${episodeId.toLowerCase()}`;
}

export function episodeOutputRoot(repoRoot, episodeId) {
  return join(repoRoot, OUTPUT_ROOT, episodeOutputDir(episodeId));
}

/** output/ep02/social/<layout>-<theme>.png */
export function socialOutputPath(repoRoot, episodeId, layoutId, theme = "dark") {
  return join(episodeOutputRoot(repoRoot, episodeId), "social", `${layoutId}-${theme}.png`);
}

/** output/ep02/social/youtube-keyart-<theme>.png */
export function keyartOutputPath(repoRoot, episodeId, theme = "dark") {
  return socialOutputPath(repoRoot, episodeId, "youtube-keyart", theme);
}

/** output/ep02/rss/ep02-<theme>.jpg */
export function podcastCoverOutputPath(repoRoot, episodeId, format = "jpg", theme = "dark") {
  return join(
    episodeOutputRoot(repoRoot, episodeId),
    "rss",
    `${episodeId.toLowerCase()}-${theme}.${format}`,
  );
}
