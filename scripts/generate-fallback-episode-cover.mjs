import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

/**
 * Renders the fallback podcast art SVG to raster assets.
 * - Source: public/logo/square-fallback-crop-v4.svg
 * - JPEG: Open Graph, Twitter, Apple Podcasts (1400+ square) — `lib/site` PODCAST_COVER_PATH
 * - PNG: optional RGB (no alpha) for clients that want PNG; re-use same size for RSS
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const input = join(root, "public/logo/square-fallback-crop-v4.svg");
const outJpg = join(root, "public/logo/square-podcast-cover.jpg");
const outPng = join(root, "public/logo/square-podcast-cover.png");

const width = 1400;
const height = 1400;
const bg = { r: 247, g: 249, b: 252, alpha: 1 };

const svg = await readFile(input);

// 1) High-res raster so trim + scale stay sharp.
// 2) `trim` removes Figma/artboard whitespace that would appear as a huge border in Podcasts/Spotify.
// 3) `cover` fills 1400×1400 (no 90px margin we used to get from `width - 180` + `inside`).
const raster = await sharp(svg)
  .resize(2400, 2400, { fit: "inside" })
  .toBuffer();
const trimmed = await sharp(raster)
  .trim({ threshold: 10 })
  .toBuffer();
const filled = await sharp(trimmed)
  .resize({ width, height, fit: "cover" })
  .toBuffer();

const base = sharp({
  create: {
    width,
    height,
    channels: 4,
    background: bg,
  },
})
  .composite([{ input: filled, left: 0, top: 0 }])
  // Flatten to opaque (no alpha) so social scrapers and iTunes are happy
  .flatten({ background: bg });

const bufJpg = await base
  .clone()
  // Baseline, standard subsampling. Progressive / mozjpeg / 4:4:4 can trip Facebook’s scraper.
  .jpeg({
    quality: 88,
    progressive: false,
    mozjpeg: false,
    chromaSubsampling: "4:2:0",
  })
  .toBuffer();
await writeFile(outJpg, bufJpg);

const bufPng = await base
  .clone()
  // Truecolor PNG; palette PNGs are smaller but some scrapers handle them badly.
  .png({ compressionLevel: 6, effort: 9, palette: false })
  .toBuffer();
await writeFile(outPng, bufPng);

console.log("Wrote", outJpg, outPng);
