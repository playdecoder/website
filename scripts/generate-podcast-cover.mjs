#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { podcastCoverCanonicalOutputPath, podcastCoverOutputPath } from "./lib/episode-output.mjs";
import { PODCAST_COVER_SIZE, renderPodcastCover, repoRoot } from "./lib/podcast-cover-frame.mjs";
import { THEMES } from "./lib/social-brand.mjs";
import {
  findSocialPost,
  loadSocialPosts,
  resolveArtFocalPoint,
  resolveArtPath,
  SOCIAL_POSTS_FILE,
} from "./lib/social-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAYOUT_ID = "podcast-cover";

function usage() {
  console.log(`Generate square podcast episode covers for RSS / Apple Podcasts / Spotify.

Usage:
  node scripts/generate-podcast-cover.mjs --episode EP02
  node scripts/generate-podcast-cover.mjs --all

Options:
  --config PATH       Social posts JSON (default: ${SOCIAL_POSTS_FILE})
  --episode ID        Episode to render (required unless --all)
  --all               Generate covers for every entry in posts[]
  -o, --output PATH   Output file (single episode only)
  --format FORMAT     jpg (default) or png
  --theme THEME       dark | light | all (default: all)
  --art PATH          Override hero art image path
  -h, --help          Show this help

Output:
  output/<ep>/rss/<ep>-<theme>.jpg   ${PODCAST_COVER_SIZE}×${PODCAST_COVER_SIZE}
  output/<ep>/rss/<ep>.jpg           canonical cover (dark theme, no suffix)

Examples:
  node scripts/generate-podcast-cover.mjs --episode EP02
  node scripts/generate-podcast-cover.mjs --all
`);
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  let config = "";
  let episode = "";
  let output = "";
  let artOverride = "";
  let format = "jpg";
  let all = false;
  let themeArg = "all";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--config":
        config = argv[++i] ?? "";
        break;
      case "--episode":
        episode = argv[++i] ?? "";
        break;
      case "--all":
        all = true;
        break;
      case "-o":
      case "--output":
        output = argv[++i] ?? "";
        break;
      case "--format":
        format = (argv[++i] ?? "jpg").toLowerCase();
        break;
      case "--art":
        artOverride = argv[++i] ?? "";
        break;
      case "--theme":
        themeArg = (argv[++i] ?? "all").toLowerCase();
        break;
      case "-h":
      case "--help":
        usage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        usage();
        process.exit(1);
    }
  }

  if (format !== "jpg" && format !== "png") {
    console.error(`Unsupported format "${format}". Use jpg or png.`);
    process.exit(1);
  }

  if (all && episode) {
    console.warn("Note: --episode ignored when using --all.");
  }

  if (all && output) {
    console.error("--output cannot be used with --all.");
    process.exit(1);
  }

  if (!all && !episode) {
    console.error("Pass --episode or --all.");
    usage();
    process.exit(1);
  }

  const themes =
    themeArg === "all"
      ? [...THEMES]
      : themeArg === "dark" || themeArg === "light"
        ? [themeArg]
        : null;
  if (!themes) {
    console.error(`Unknown theme "${themeArg}". Use dark, light, or all.`);
    process.exit(1);
  }

  if (themes.length > 1 && output) {
    console.error("--output cannot be used when generating multiple themes.");
    process.exit(1);
  }

  return { config, episode, output, artOverride, format, all, themes };
}

async function loadEpisodes() {
  const path = join(repoRoot, "data/episodes.json");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

async function loadConfigFile(config) {
  if (config) {
    const path = resolve(repoRoot, config);
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  }
  return loadSocialPosts(repoRoot);
}

function resolveCoverTitle(postConfig, episode) {
  if (postConfig.title) {
    return postConfig.title;
  }
  const hostName = episode.hosts?.[0]?.fullName;
  if (episode.format === "spotlight" && hostName) {
    return hostName;
  }
  return episode.title;
}

function resolveCoverSubtitle(postConfig, episode) {
  const explicit = postConfig.subtitle ?? postConfig.coverSubtitle;
  if (explicit) {
    return explicit;
  }
  if (episode.format === "spotlight") {
    const colon = episode.title.indexOf(":");
    if (colon >= 0) {
      return episode.title.slice(colon + 1).trim();
    }
  }
  return "";
}

async function enrichPost(postConfig) {
  const episodes = await loadEpisodes();
  const episode = episodes.find((ep) => ep.id.toUpperCase() === postConfig.episodeId.toUpperCase());
  if (!episode) {
    throw new Error(`Episode ${postConfig.episodeId} not found in data/episodes.json`);
  }

  return {
    episodeId: episode.id,
    slug: episode.slug,
    title: resolveCoverTitle(postConfig, episode),
    subtitle: resolveCoverSubtitle(postConfig, episode),
    episodeFormat: episode.format,
    artPath: postConfig.art ? resolve(repoRoot, postConfig.art) : undefined,
  };
}

async function renderCoverBuffer({
  episodeId,
  title,
  subtitle,
  episodeFormat,
  artPath,
  artFocalPoint,
  imageFormat,
  theme,
}) {
  return renderPodcastCover({
    episodeId,
    title,
    subtitle,
    episodeFormat,
    artPath,
    artFocalPoint,
    format: imageFormat,
    theme,
  });
}

async function renderOne({
  episodeId,
  title,
  subtitle,
  episodeFormat,
  artPath,
  artFocalPoint,
  imageFormat,
  theme,
  outputPath,
}) {
  await mkdir(dirname(outputPath), { recursive: true });

  const buf = await renderCoverBuffer({
    episodeId,
    title,
    subtitle,
    episodeFormat,
    artPath,
    artFocalPoint,
    imageFormat,
    theme,
  });

  await writeFile(outputPath, buf);
  console.log("Wrote", outputPath);
  return buf;
}

async function main() {
  const { config, episode, output, artOverride, format, all, themes } = parseArgs(
    process.argv.slice(2),
  );
  const file = await loadConfigFile(config);
  const postEntries = all ? (file.posts ?? []) : [{ episodeId: episode }];

  if (postEntries.length === 0) {
    throw new Error("No posts found in config.");
  }

  const written = [];

  for (const entry of postEntries) {
    const episodeId = entry.episodeId ?? episode;
    const post = findSocialPost(file, episodeId);
    const resolved = await enrichPost(post);

    if (artOverride) {
      resolved.artPath = resolve(repoRoot, artOverride);
    }

    const artPath = resolveArtPath({ repoRoot, post, layoutId: LAYOUT_ID }) ?? resolved.artPath;
    const artFocalPoint = resolveArtFocalPoint({ file, post, layoutId: LAYOUT_ID });
    const renderArgs = { ...resolved, artPath, artFocalPoint, imageFormat: format };
    const themeBuffers = new Map();

    for (const theme of themes) {
      const outPath = output
        ? resolve(repoRoot, output)
        : podcastCoverOutputPath(repoRoot, resolved.episodeId, format, theme);

      const buf = await renderOne({ ...renderArgs, theme, outputPath: outPath });
      themeBuffers.set(theme, buf);
      written.push(outPath);
    }

    let darkBuf = themeBuffers.get("dark");
    if (!darkBuf) {
      darkBuf = await renderCoverBuffer({ ...renderArgs, theme: "dark" });
    }

    const canonicalPath = podcastCoverCanonicalOutputPath(repoRoot, resolved.episodeId, format);
    await mkdir(dirname(canonicalPath), { recursive: true });
    await writeFile(canonicalPath, darkBuf);
    console.log("Wrote", canonicalPath);
    written.push(canonicalPath);

    if (resolved.artPath && !(await fileExists(resolved.artPath))) {
      console.warn("Art file missing:", resolved.artPath);
      console.warn("Rendered with placeholder — add art and re-run.");
    }
  }

  if (all) {
    console.log(`\nGenerated ${written.length} podcast cover(s) → output/<ep>/rss/`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
