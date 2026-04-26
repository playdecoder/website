import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const input = join(root, "public/logo/square-light-crop-v4.svg");
const output = join(root, "public/logo/square-podcast-cover.png");

const width = 1400;
const height = 1400;
const bg = { r: 247, g: 249, b: 252, alpha: 1 };

const svg = await readFile(input);
const logo = await sharp(svg)
  .resize({ width: width - 180, height: height - 180, fit: "inside" })
  .toBuffer();

await sharp({
  create: {
    width,
    height,
    channels: 4,
    background: bg,
  },
})
  .composite([{ input: logo, gravity: "center" }])
  .png()
  .toFile(output);

console.log("Wrote", output);
