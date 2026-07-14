#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { socialOutputPath } from "./lib/episode-output.mjs";
import {
  EPISODE_FORMAT_LABELS,
  isSpecialSocialFormat,
  normalizeSocialFormat,
} from "./lib/format-tokens.mjs";
import { THEMES } from "./lib/social-brand.mjs";
import {
  findSocialPost,
  loadSocialPosts,
  resolveArtFocalPoint,
  resolveArtPath,
  SOCIAL_POSTS_FILE,
} from "./lib/social-config.mjs";
import {
  DEFAULT_LAYOUT,
  LAYOUT_IDS,
  LAYOUTS,
  renderSocialFrame,
  repoRoot,
  resolveLayout,
} from "./lib/social-frame.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function usage() {
  const layoutList = LAYOUT_IDS.map(
    (id) => `    ${id.padEnd(16)} ${LAYOUTS[id].width}×${LAYOUTS[id].height}  ${LAYOUTS[id].label}`,
  ).join("\n");

  console.log(`Generate Dekodér-branded social post frames (PNG).

Usage:
  node scripts/generate-social-post.mjs --episode EP02
  node scripts/generate-social-post.mjs --all-episodes --all-layouts

Options:
  --config PATH       Social posts JSON (default: ${SOCIAL_POSTS_FILE})
  --episode ID        Episode to render (required unless --all-episodes)
  --all-episodes      Generate for every entry in posts[]
  --layout ID         Frame layout (default: ${DEFAULT_LAYOUT})
  --all-layouts, -a   Generate every layout (per episode)
  --theme THEME       dark | light | all (default: all)
  -o, --output PATH   Output PNG (single layout + single episode + single theme only)
  --art PATH          Override hero art image path
  --format FORMAT     normal | spotlight | flashback (default: from episode / post config)
  -h, --help          Show this help

Output:
  output/<ep>/social/<layout>-<theme>.png   e.g. output/ep02/social/ig-post-dark.png

Post config (${SOCIAL_POSTS_FILE}, per entry in posts[]):
  episodeId           Required — matches data/episodes.json id
  format              normal | spotlight | flashback (optional)
  title               Social frame headline (optional; spotlight defaults to host name)
  shortDescription    Subtitle / description line on the frame
  description         Alias for shortDescription
  art                 Hero image path (optional)
  artFocalPoint       centre | top | { x, y } (optional)
  layouts             Per-layout overrides (optional)

Layouts:
${layoutList}

Examples:
  node scripts/generate-social-post.mjs --episode EP02 --all-layouts
  node scripts/generate-social-post.mjs --episode SP01 --format spotlight --all-layouts
  node scripts/generate-social-post.mjs --episode EP03 --format normal --layout ig-post
  node scripts/generate-social-post.mjs --all-episodes --all-layouts
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
  let layout = DEFAULT_LAYOUT;
  let allLayouts = false;
  let allEpisodes = false;
  let themeArg = "all";
  let formatOverride = "";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--config":
        config = argv[++i] ?? "";
        break;
      case "--episode":
        episode = argv[++i] ?? "";
        break;
      case "--all-episodes":
        allEpisodes = true;
        break;
      case "--layout":
        layout = argv[++i] ?? DEFAULT_LAYOUT;
        break;
      case "--all-layouts":
      case "-a":
        allLayouts = true;
        break;
      case "-o":
      case "--output":
        output = argv[++i] ?? "";
        break;
      case "--art":
        artOverride = argv[++i] ?? "";
        break;
      case "--theme":
        themeArg = (argv[++i] ?? "all").toLowerCase();
        break;
      case "--format":
        formatOverride = (argv[++i] ?? "").toLowerCase();
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

  if (allEpisodes && episode) {
    console.warn("Note: --episode ignored when using --all-episodes.");
  }

  if (allLayouts && layout !== DEFAULT_LAYOUT) {
    console.warn(`Note: --layout ${layout} ignored; generating all layouts.`);
  }

  if ((allEpisodes || allLayouts) && output) {
    console.error("--output cannot be used with --all-episodes or --all-layouts.");
    process.exit(1);
  }

  if (!allEpisodes && !episode) {
    console.error("Pass --episode or --all-episodes.");
    usage();
    process.exit(1);
  }

  if (!allLayouts) {
    resolveLayout(layout);
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

  if (formatOverride) {
    formatOverride = normalizeSocialFormat(formatOverride);
  }

  return {
    config,
    episode,
    output,
    artOverride,
    layout,
    allLayouts,
    allEpisodes,
    themes,
    formatOverride,
  };
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

async function resolvePostBundle(file, episodeId) {
  if (file.posts) {
    return { file, post: findSocialPost(file, episodeId) };
  }
  return { file: { defaults: {}, layouts: {} }, post: file };
}

async function enrichFromEpisodeCatalog(postConfig) {
  const episodes = await loadEpisodes();
  const episode = episodes.find((ep) => ep.id.toUpperCase() === postConfig.episodeId.toUpperCase());
  if (!episode) {
    throw new Error(`Episode ${postConfig.episodeId} not found in data/episodes.json`);
  }

  const format = normalizeSocialFormat(
    postConfig.format ?? postConfig.variant ?? episode.format ?? "normal",
  );
  const formatOrdinal = parseInt(episode.id.replace(/\D/g, ""), 10) || 1;
  const hostName = episode.hosts?.[0]?.fullName ?? "";
  const defaultTitle = format === "spotlight" && hostName ? hostName : episode.title;

  return {
    episodeId: episode.id,
    slug: episode.slug,
    title: postConfig.title ?? defaultTitle,
    description: postConfig.shortDescription ?? postConfig.description ?? "",
    artPath: postConfig.art ? resolve(repoRoot, postConfig.art) : undefined,
    format,
    formatLabel: isSpecialSocialFormat(format) ? EPISODE_FORMAT_LABELS[format] : undefined,
    formatOrdinal,
    hostName,
  };
}

async function renderOne(resolved, layoutId, theme, outputPath, { file, post }) {
  await mkdir(dirname(outputPath), { recursive: true });

  const png = await renderSocialFrame({
    episodeId: resolved.episodeId,
    title: resolved.title,
    description: resolved.description,
    artPath: resolveArtPath({ repoRoot, post, layoutId }) ?? resolved.artPath,
    artFocalPoint: resolveArtFocalPoint({ file, post, layoutId }),
    layout: layoutId,
    theme,
    format: resolved.format,
    formatLabel: resolved.formatLabel,
    formatOrdinal: resolved.formatOrdinal,
    hostName: resolved.hostName,
  });

  await writeFile(outputPath, png);
  console.log("Wrote", outputPath);
}

async function generateForEpisode({
  file,
  episodeId,
  artOverride,
  layout,
  allLayouts,
  output,
  themes,
  formatOverride,
}) {
  const bundle = await resolvePostBundle(file, episodeId);
  const resolved = await enrichFromEpisodeCatalog(bundle.post);

  if (formatOverride) {
    resolved.format = normalizeSocialFormat(formatOverride);
  }

  if (artOverride) {
    resolved.artPath = resolve(repoRoot, artOverride);
  }

  if (!resolved.description) {
    console.warn(
      `Warning: no shortDescription for ${resolved.episodeId} — add one for social copy.`,
    );
  }

  const layoutsToRender = allLayouts ? LAYOUT_IDS : [layout];
  const written = [];

  for (const layoutId of layoutsToRender) {
    for (const theme of themes) {
      const outPath = output
        ? resolve(repoRoot, output)
        : socialOutputPath(repoRoot, resolved.episodeId, layoutId, theme);

      await renderOne(resolved, layoutId, theme, outPath, bundle);
      written.push(outPath);
    }
  }

  if (resolved.artPath && !(await fileExists(resolved.artPath))) {
    console.warn("Art file missing:", resolved.artPath);
    console.warn("Rendered with placeholder — add art and re-run.");
  }

  return written;
}

async function main() {
  const {
    config,
    episode,
    output,
    artOverride,
    layout,
    allLayouts,
    allEpisodes,
    themes,
    formatOverride,
  } = parseArgs(process.argv.slice(2));
  const file = await loadConfigFile(config);
  const episodeIds = allEpisodes ? (file.posts ?? []).map((post) => post.episodeId) : [episode];

  if (episodeIds.length === 0) {
    throw new Error("No posts found in config.");
  }

  const written = [];

  for (const episodeId of episodeIds) {
    const paths = await generateForEpisode({
      file,
      episodeId,
      artOverride,
      layout,
      allLayouts,
      output: allEpisodes ? "" : output,
      themes,
      formatOverride,
    });
    written.push(...paths);
  }

  if (allEpisodes || allLayouts) {
    console.log(`\nGenerated ${written.length} social frame(s) → output/<ep>/social/`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
