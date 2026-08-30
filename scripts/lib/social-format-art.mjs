import { access } from "node:fs/promises";
import { extname } from "node:path";

import sharp from "sharp";

import { normalizeArtFocalPoint, coverArt } from "./social-frame.mjs";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function hostInitialsFromName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function edgeFadeMaskSvg(w, h, { right = 0, bottom = 0 } = {}) {
  const rightStart = right > 0 ? Math.round((1 - right) * 100) : 100;
  const bottomStart = bottom > 0 ? Math.round((1 - bottom) * 100) : 100;

  const rightMask =
    right > 0
      ? `<rect width="100%" height="100%" fill="url(#fade-right)" style="mix-blend-mode:multiply"/>`
      : "";
  const bottomMask =
    bottom > 0
      ? `<rect width="100%" height="100%" fill="url(#fade-bottom)" style="mix-blend-mode:multiply"/>`
      : "";

  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="white"/>
          <stop offset="${rightStart}%" stop-color="white"/>
          <stop offset="100%" stop-color="black"/>
        </linearGradient>
        <linearGradient id="fade-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white"/>
          <stop offset="${bottomStart}%" stop-color="white"/>
          <stop offset="100%" stop-color="black"/>
        </linearGradient>
        <mask id="edge-mask">
          <rect width="100%" height="100%" fill="white"/>
          ${rightMask}
          ${bottomMask}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="white" mask="url(#edge-mask)"/>
    </svg>
  `);
}

async function applyEdgeFade(imageBuf, w, h, fade) {
  const mask = await sharp(edgeFadeMaskSvg(w, h, fade))
    .png()
    .toBuffer();
  return sharp(imageBuf)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function bottomScrimSvg(w, h, brand, formatAccent, strength = 0.92) {
  const scrimH = Math.round(h * 0.46);
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${brand.bg}" stop-opacity="0"/>
          <stop offset="38%" stop-color="${brand.bg}" stop-opacity="${(strength * 0.45).toFixed(2)}"/>
          <stop offset="72%" stop-color="${brand.bg}" stop-opacity="${strength.toFixed(2)}"/>
          <stop offset="100%" stop-color="${brand.bg}" stop-opacity="1"/>
        </linearGradient>
        <radialGradient id="warm" cx="50%" cy="18%" r="72%">
          <stop offset="0%" stop-color="${formatAccent}" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="${formatAccent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="${h - scrimH}" width="${w}" height="${scrimH}" fill="url(#scrim)"/>
      <rect width="100%" height="100%" fill="url(#warm)"/>
    </svg>
  `);
}

async function placeholderColumnArt(w, h, brand, hostName, scale, formatAccent) {
  const initials = hostInitialsFromName(hostName);
  return sharp({
    create: { width: w, height: h, channels: 4, background: brand.surface },
  })
    .composite([
      {
        input: Buffer.from(`
          <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ph" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${brand.surface}"/>
                <stop offset="100%" stop-color="${brand.bg}"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#ph)"/>
            <text x="50%" y="48%" text-anchor="middle" dominant-baseline="middle"
              fill="${formatAccent}" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) * 0.16)}" font-weight="700">${initials}</text>
            <text x="50%" y="58%" text-anchor="middle" dominant-baseline="middle"
              fill="${brand.muted}" font-family="sans-serif" font-size="${Math.round(14 * scale)}" letter-spacing="0.14em">HOST PHOTO</text>
          </svg>
        `),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

function portraitSiblingPaths(artPath) {
  const ext = extname(artPath);
  const stem = artPath.slice(0, -ext.length).replace(/-transparent$/, "");
  return {
    transparent: `${stem}-transparent.png`,
    background: `${stem}-bg.jpg`,
  };
}

async function opaqueContentBox(imagePath) {
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * ch + 3] <= 32) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY, w, h, bw: maxX - minX + 1, bh: maxY - minY + 1 };
}

async function coverBottomAlign(imageBuf, w, h) {
  return sharp(imageBuf)
    .resize(w, h, { fit: "cover", position: "bottom" })
    .png()
    .toBuffer();
}

async function composeCutoutColumnArt({ transparentPath, backgroundPath, box, w, h, brand }) {
  const sidePad = 8;
  const topPad = 8;
  const bottomOverscan = 3;
  const left = Math.max(0, box.minX - sidePad);
  const top = Math.max(0, box.minY - topPad);
  const right = Math.min(box.w, box.maxX + 1 + sidePad);
  const bottom = Math.min(box.h, Math.max(top + 1, box.maxY + 1 - bottomOverscan));
  const extractW = right - left;
  const extractH = bottom - top;
  const cutout = await sharp(transparentPath)
    .extract({ left, top, width: extractW, height: extractH })
    .png()
    .toBuffer();
  const person = await coverBottomAlign(cutout, w, h);

  const background = backgroundPath
    ? await sharp(await coverArt(backgroundPath, w, h, { x: 0.62, y: 0.42 }))
        .blur(10)
        .modulate({ brightness: 0.62, saturation: 0.85 })
        .png()
        .toBuffer()
    : await sharp({
        create: { width: w, height: h, channels: 4, background: brand.bg },
      })
        .png()
        .toBuffer();

  const composed = await sharp(background)
    .composite([{ input: person, top: 0, left: 0 }])
    .png()
    .toBuffer();
  return applyEdgeFade(composed, w, h, { right: 0.2 });
}

async function composeFormatColumnArt({
  artPath,
  w,
  h,
  focal,
  brand,
  hostName,
  scale,
  formatAccent,
}) {
  if (!artPath || !(await fileExists(artPath))) {
    return placeholderColumnArt(w, h, brand, hostName, scale, formatAccent);
  }

  const siblings = portraitSiblingPaths(artPath);
  const transparentPath = (await fileExists(siblings.transparent))
    ? siblings.transparent
    : (await sharp(artPath).metadata()).hasAlpha
      ? artPath
      : "";

  if (transparentPath) {
    const box = await opaqueContentBox(transparentPath);
    if (box && (box.bh / box.h < 0.85 || box.maxY / box.h < 0.9)) {
      const backgroundPath = (await fileExists(siblings.background)) ? siblings.background : "";
      return composeCutoutColumnArt({ transparentPath, backgroundPath, box, w, h, brand });
    }
  }

  let cover = await coverArt(artPath, w, h, focal);
  cover = await applyEdgeFade(cover, w, h, { right: 0.2 });
  return cover;
}

async function composeFormatBannerArt({
  artPath,
  w,
  h,
  focal,
  brand,
  hostName,
  scale,
  formatAccent,
}) {
  if (!artPath || !(await fileExists(artPath))) {
    const placeholder = await placeholderColumnArt(w, h, brand, hostName, scale, formatAccent);
    return sharp(placeholder)
      .composite([{ input: bottomScrimSvg(w, h, brand, formatAccent), top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  const cover = await coverArt(artPath, w, h, focal);
  const faded = await applyEdgeFade(cover, w, h, { bottom: 0.34 });

  return sharp(faded)
    .composite([{ input: bottomScrimSvg(w, h, brand, formatAccent), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export async function composeFormatPortraitArt({
  artPath,
  m,
  focalPoint = "centre",
  brand,
  hostName = "",
  formatAccent,
}) {
  const w = m.artWidth;
  const h = m.artHeight;
  const focal = normalizeArtFocalPoint(focalPoint);
  const style = m.formatArtStyle ?? (m.artMode === "left" ? "column" : "banner");

  if (style === "column") {
    return composeFormatColumnArt({
      artPath,
      w,
      h,
      focal,
      brand,
      hostName,
      scale: m.scale,
      formatAccent,
    });
  }

  return composeFormatBannerArt({
    artPath,
    w,
    h,
    focal,
    brand,
    hostName,
    scale: m.scale,
    formatAccent,
  });
}
