import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

/** Post layout → post → layout default → file default. */
export function resolveArtFocalPoint({ file, post, layoutId }) {
  return (
    post.layouts?.[layoutId]?.artFocalPoint ??
    post.artFocalPoint ??
    file.layouts?.[layoutId]?.artFocalPoint ??
    file.defaults?.artFocalPoint ??
    "centre"
  );
}

/** Post layout art → post art (paths relative to repo root). */
export function resolveArtPath({ repoRoot, post, layoutId }) {
  const rel = post.layouts?.[layoutId]?.art ?? post.art;
  return rel ? join(repoRoot, rel) : undefined;
}
