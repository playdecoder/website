#!/usr/bin/env node
/**
 * Optimize a vertical host portrait and build a 16:9 landscape key art
 * for website player backgrounds and podcast cover generation.
 *
 * Usage:
 *   node scripts/prepare-spotlight-keyart.mjs --portrait public/social/art/sp01-jarek-kolar.jpg
 *   node scripts/prepare-spotlight-keyart.mjs --portrait in.jpg --background in-bg.jpg --keyart out-keyart.jpg
 */
import { access } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { coverArt, normalizeArtFocalPoint } from "./lib/social-frame.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const KEYART_W = 1920;
const KEYART_H = 1080;
const COLUMN_RATIO = 0.46;
const PORTRAIT_MAX_H = 1600;
const BG = "#0B0F14";
const DEFAULT_BG_FOCAL = { x: 0.62, y: 0.42 };

function usage() {
  console.log(`Prepare spotlight episode art assets.

Usage:
  node scripts/prepare-spotlight-keyart.mjs --portrait PATH [options]

Options:
  --portrait PATH     Vertical host photo (required)
  --background PATH   Widescreen game art (default: <portrait-stem>-bg.jpg if present)
  --keyart PATH       16:9 output (default: <episode-id>-keyart.jpg in same dir)
  --focal X,Y         Portrait face focal point 0–1 (default: 0.5,0.28)
  --bg-focal X,Y      Background crop focal point 0–1 (default: 0.62,0.42)
  --skip-optimize     Skip portrait resize/compress step
  -h, --help          Show this help
`);
}

function parseFocal(raw, fallback) {
  if (!raw) return fallback;
  const [x, y] = raw.split(",").map(Number);
  return { x, y };
}

function parseArgs(argv) {
  let portrait = "";
  let background = "";
  let keyart = "";
  let focal = { x: 0.5, y: 0.28 };
  let bgFocal = DEFAULT_BG_FOCAL;
  let skipOptimize = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--portrait":
        portrait = argv[++i] ?? "";
        break;
      case "--background":
        background = argv[++i] ?? "";
        break;
      case "--keyart":
        keyart = argv[++i] ?? "";
        break;
      case "--focal":
        focal = parseFocal(argv[++i], focal);
        break;
      case "--bg-focal":
        bgFocal = parseFocal(argv[++i], bgFocal);
        break;
      case "--skip-optimize":
        skipOptimize = true;
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

  if (!portrait) {
    console.error("Missing --portrait PATH");
    usage();
    process.exit(1);
  }

  return { portrait, background, keyart, focal, bgFocal, skipOptimize };
}

function defaultBackgroundPath(portraitPath) {
  const ext = extname(portraitPath);
  const base = portraitPath.slice(0, -ext.length).replace(/-transparent$/, "");
  return `${base}-bg.jpg`;
}

async function portraitHasAlpha(portraitPath) {
  const meta = await sharp(portraitPath).metadata();
  return Boolean(meta.hasAlpha);
}

function defaultKeyartPath(portraitPath) {
  const dir = dirname(portraitPath);
  const base = basename(portraitPath, extname(portraitPath));
  const match = /^((?:sp|fb|ep)\d+)/i.exec(base);
  if (match) {
    return join(dir, `${match[1].toLowerCase()}-keyart.jpg`);
  }
  return join(dir, `${base}-keyart.jpg`);
}

function edgeFadeMaskSvg(w, h, { right = 0 } = {}) {
  if (right <= 0) {
    return Buffer.from(`
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
      </svg>
    `);
  }

  const fadeStart = Math.round((1 - right) * 100);
  const fadeMid = Math.round(fadeStart + right * 42);
  const fadeLate = Math.round(fadeStart + right * 78);

  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="white"/>
          <stop offset="${fadeStart}%" stop-color="white"/>
          <stop offset="${fadeMid}%" stop-color="#b8b8b8"/>
          <stop offset="${fadeLate}%" stop-color="#404040"/>
          <stop offset="100%" stop-color="black"/>
        </linearGradient>
        <mask id="edge-mask">
          <rect width="100%" height="100%" fill="white"/>
          <rect width="100%" height="100%" fill="url(#fade-right)"/>
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="white" mask="url(#edge-mask)"/>
    </svg>
  `);
}

function scrimSvg(w, h, { transparent = false } = {}) {
  const seam = Math.round(COLUMN_RATIO * 100);
  if (transparent) {
    return Buffer.from(`
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="h-scrim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${BG}" stop-opacity="0.42"/>
            <stop offset="${seam - 6}%" stop-color="${BG}" stop-opacity="0.3"/>
            <stop offset="${seam + 10}%" stop-color="${BG}" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="${BG}" stop-opacity="0.16"/>
          </linearGradient>
          <linearGradient id="v-scrim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${BG}" stop-opacity="0.06"/>
            <stop offset="55%" stop-color="${BG}" stop-opacity="0"/>
            <stop offset="100%" stop-color="${BG}" stop-opacity="0.5"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#h-scrim)"/>
        <rect width="100%" height="100%" fill="url(#v-scrim)"/>
      </svg>
    `);
  }

  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="h-scrim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${BG}" stop-opacity="0.86"/>
          <stop offset="${seam - 10}%" stop-color="${BG}" stop-opacity="0.72"/>
          <stop offset="${seam + 2}%" stop-color="${BG}" stop-opacity="0.54"/>
          <stop offset="${seam + 16}%" stop-color="${BG}" stop-opacity="0.36"/>
          <stop offset="${seam + 30}%" stop-color="${BG}" stop-opacity="0.24"/>
          <stop offset="100%" stop-color="${BG}" stop-opacity="0.18"/>
        </linearGradient>
        <linearGradient id="v-scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${BG}" stop-opacity="0.1"/>
          <stop offset="48%" stop-color="${BG}" stop-opacity="0"/>
          <stop offset="100%" stop-color="${BG}" stop-opacity="0.58"/>
        </linearGradient>
        <radialGradient id="vignette" cx="72%" cy="42%" r="68%">
          <stop offset="0%" stop-color="${BG}" stop-opacity="0"/>
          <stop offset="100%" stop-color="${BG}" stop-opacity="0.28"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#h-scrim)"/>
      <rect width="100%" height="100%" fill="url(#v-scrim)"/>
      <rect width="100%" height="100%" fill="url(#vignette)"/>
    </svg>
  `);
}

function seamSoftenerSvg(w, h) {
  const seam = Math.round(COLUMN_RATIO * 100);
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="seam-soft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${BG}" stop-opacity="0"/>
          <stop offset="${seam - 14}%" stop-color="${BG}" stop-opacity="0"/>
          <stop offset="${seam - 2}%" stop-color="${BG}" stop-opacity="0.08"/>
          <stop offset="${seam + 8}%" stop-color="${BG}" stop-opacity="0.14"/>
          <stop offset="${seam + 22}%" stop-color="${BG}" stop-opacity="0"/>
          <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#seam-soft)"/>
    </svg>
  `);
}

async function applyEdgeFade(imageBuf, w, h, fade) {
  const mask = await sharp(edgeFadeMaskSvg(w, h, fade)).png().toBuffer();
  return sharp(imageBuf).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function optimizePortrait(portraitPath) {
  const isPng = portraitPath.toLowerCase().endsWith(".png");

  if (isPng) {
    const meta = await sharp(portraitPath).metadata();
    let pipeline = sharp(portraitPath);
    if ((meta.height ?? 0) > PORTRAIT_MAX_H) {
      pipeline = pipeline.resize({ height: PORTRAIT_MAX_H, withoutEnlargement: true });
    }

    const buf = await pipeline
      .png({ palette: true, colours: 256, quality: 92, effort: 10, compressionLevel: 9 })
      .toBuffer();
    await sharp(buf).toFile(portraitPath);

    const after = await sharp(portraitPath).metadata();
    return { width: after.width, height: after.height, bytes: buf.length };
  }

  const meta = await sharp(portraitPath).metadata();
  const needsResize = (meta.height ?? 0) > PORTRAIT_MAX_H;

  let pipeline = sharp(portraitPath);
  if (needsResize) {
    pipeline = pipeline.resize({ height: PORTRAIT_MAX_H, withoutEnlargement: true });
  }

  const buf = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  await sharp(buf).toFile(portraitPath);

  const after = await sharp(portraitPath).metadata();
  return { width: after.width, height: after.height, bytes: buf.length };
}

async function composeBackgroundLayer(bgPath, w, h, bgFocal) {
  const cover = await coverArt(bgPath, w, h, normalizeArtFocalPoint(bgFocal));
  return sharp(cover).blur(18).modulate({ brightness: 0.72, saturation: 0.88 }).png().toBuffer();
}

async function composeKeyart({ portraitPath, keyartPath, backgroundPath, focal, bgFocal }) {
  const colW = Math.round(KEYART_W * COLUMN_RATIO);
  const normalized = normalizeArtFocalPoint(focal);
  const transparent = await portraitHasAlpha(portraitPath);

  let column = await coverArt(portraitPath, colW, KEYART_H, normalized);
  if (transparent) {
    column = await applyEdgeFade(column, colW, KEYART_H, { right: 0.22 });
  } else {
    column = await applyEdgeFade(column, colW, KEYART_H, { right: 0.38 });
  }

  const layers = [];

  if (backgroundPath) {
    layers.push({ input: await composeBackgroundLayer(backgroundPath, KEYART_W, KEYART_H, bgFocal) });
  } else {
    layers.push({
      input: Buffer.from(
        `<svg width="${KEYART_W}" height="${KEYART_H}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${BG}"/>
        </svg>`,
      ),
    });
  }

  if (!transparent) {
    layers.push({ input: await sharp(scrimSvg(KEYART_W, KEYART_H)).png().toBuffer() });
    layers.push({ input: await sharp(seamSoftenerSvg(KEYART_W, KEYART_H)).png().toBuffer() });
  } else {
    layers.push({
      input: await sharp(scrimSvg(KEYART_W, KEYART_H, { transparent: true })).png().toBuffer(),
    });
  }

  layers.push({ input: column, top: 0, left: 0 });

  await sharp({
    create: { width: KEYART_W, height: KEYART_H, channels: 4, background: BG },
  })
    .composite(layers)
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(keyartPath);

  const meta = await sharp(keyartPath).metadata();
  const { size } = await import("node:fs/promises").then((fs) => fs.stat(keyartPath));
  return { width: meta.width, height: meta.height, bytes: size };
}

async function main() {
  const { portrait, background, keyart, focal, bgFocal, skipOptimize } = parseArgs(process.argv.slice(2));
  const portraitPath = resolve(repoRoot, portrait);

  try {
    await access(portraitPath);
  } catch {
    console.error(`Portrait not found: ${portraitPath}`);
    process.exit(1);
  }

  const keyartPath = keyart ? resolve(repoRoot, keyart) : defaultKeyartPath(portraitPath);

  let backgroundPath = background ? resolve(repoRoot, background) : defaultBackgroundPath(portraitPath);
  try {
    await access(backgroundPath);
  } catch {
    if (background) {
      console.error(`Background not found: ${backgroundPath}`);
      process.exit(1);
    }
    backgroundPath = "";
    console.warn("No background image found — using solid panel.");
  }

  if (!skipOptimize) {
    const opt = await optimizePortrait(portraitPath);
    console.log(
      `Optimized portrait → ${portraitPath} (${opt.width}×${opt.height}, ${(opt.bytes / 1024).toFixed(0)} KB)`,
    );
  }

  const key = await composeKeyart({
    portraitPath,
    keyartPath,
    backgroundPath,
    focal,
    bgFocal,
  });
  console.log(
    `Key art → ${keyartPath} (${key.width}×${key.height}, ${(key.bytes / 1024).toFixed(0)} KB)`,
  );
  if (backgroundPath) {
    console.log(`Background → ${backgroundPath}`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
