import { access } from "node:fs/promises";

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
  const mask = await sharp(edgeFadeMaskSvg(w, h, fade)).png().toBuffer();
  return sharp(imageBuf).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
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

async function composeFormatColumnArt({ artPath, w, h, focal, brand, hostName, scale, formatAccent }) {
  if (!artPath || !(await fileExists(artPath))) {
    return placeholderColumnArt(w, h, brand, hostName, scale, formatAccent);
  }

  let cover = await coverArt(artPath, w, h, focal);
  cover = await applyEdgeFade(cover, w, h, { right: 0.2 });
  return cover;
}

async function composeFormatBannerArt({ artPath, w, h, focal, brand, hostName, scale, formatAccent }) {
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
