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
const logo = await sharp(svg)
  .resize({ width: width - 180, height: height - 180, fit: "inside" })
  .toBuffer();

const base = sharp({
  create: {
    width,
    height,
    channels: 4,
    background: bg,
  },
}).composite([{ input: logo, gravity: "center" }])
  // Flatten to opaque (no alpha) so social scrapers and iTunes are happy
  .flatten({ background: bg });

const bufJpg = await base
  .clone()
  .jpeg({ mozjpeg: true, quality: 90, chromaSubsampling: "4:4:4" })
  .toBuffer();
await writeFile(outJpg, bufJpg);

const bufPng = await base
  .clone()
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer();
await writeFile(outPng, bufPng);

console.log("Wrote", outJpg, outPng);
