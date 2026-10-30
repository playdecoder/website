import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { LAYOUTS } from "./social-layouts.mjs";

export const SOCIAL_POSTS_FILE = "data/social-posts.json";

/** @typedef {{ x: number, y: number }} ArtFocalPointCoords */
/** @typedef {string | ArtFocalPointCoords} ArtFocalPoint */

export async function loadSocialPosts(repoRoot) {
  const path = join(repoRoot, SOCIAL_POSTS_FILE);
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

export function findSocialPost(file, episodeId) {
  const id = episodeId.toUpperCase();
  const post = file.posts?.find((entry) => entry.episodeId.toUpperCase() === id);
  if (!post) {
    const known = file.posts?.map((entry) => entry.episodeId).join(", ") ?? "(none)";
    throw new Error(`Episode ${id} not found in ${SOCIAL_POSTS_FILE}. Known: ${known}`);
  }
  return post;
}

/** A layout's own overrides, falling back to the layout it borrows crops from (`configFrom`). */
function layoutOverrides(layouts, layoutId) {
  const from = LAYOUTS[layoutId]?.configFrom;
  return { ...(from ? layouts?.[from] : undefined), ...layouts?.[layoutId] };
}

/** Post layout → post → layout default → file default. */
export function resolveArtFocalPoint({ file, post, layoutId }) {
  return (
    layoutOverrides(post.layouts, layoutId).artFocalPoint ??
    post.artFocalPoint ??
    layoutOverrides(file.layouts, layoutId).artFocalPoint ??
    file.defaults?.artFocalPoint ??
    "centre"
  );
}

/** Post layout art → post art (paths relative to repo root). */
export function resolveArtPath({ repoRoot, post, layoutId }) {
  const rel = layoutOverrides(post.layouts, layoutId).art ?? post.art;
  return rel ? join(repoRoot, rel) : undefined;
}

/**
 * Post layout → post → layout default → file default. 1 = cover crop (default);
 * below 1 scales the portrait down inside the column so a wide head fits.
 */
export function resolveArtZoom({ file, post, layoutId }) {
  const raw =
    layoutOverrides(post.layouts, layoutId).artZoom ??
    post.artZoom ??
    layoutOverrides(file.layouts, layoutId).artZoom ??
    file.defaults?.artZoom ??
    1;
  const zoom = Number(raw);
  if (!Number.isFinite(zoom) || zoom <= 0 || zoom > 1) {
    throw new Error(`artZoom must be a number in (0, 1]; got ${JSON.stringify(raw)}`);
  }
  return zoom;
}
