/**
 * Square podcast episode cover (1400×1400) for RSS / Apple Podcasts / Spotify.
 * Same visual language as the social frames — art-on-top seam, dark panel,
 * compact EP badge, oversized title, footer motif + logo.
 */
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { FONTS, getBrand, getLogoPath, LOGO_WORDMARK_HEIGHT } from "./social-brand.mjs";
import { getFormatTokens, isSpecialSocialFormat } from "./format-tokens.mjs";
import { coverArt, ensureFonts } from "./social-frame.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

export const PODCAST_COVER_SIZE = 1400;

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text, maxChars) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fontFaceStyles(fonts) {
  return `
    @font-face {
      font-family: '${FONTS.display}';
      font-weight: 800;
      font-style: normal;
      src: url('data:font/woff2;base64,${fonts["syne-800"]}') format('woff2');
    }
    @font-face {
      font-family: '${FONTS.mono}';
      font-weight: 500;
      font-style: normal;
      src: url('data:font/woff2;base64,${fonts["jetbrains-mono-500"]}') format('woff2');
    }
  `;
}

function motifBarsSvg(x, bottomY, scale, brand) {
  const w = 5 * scale;
  const gap = 4 * scale;
  const bars = [
    { h: 20 * scale, fill: brand.accent },
    { h: 28 * scale, fill: brand.secondary },
    { h: 14 * scale, fill: brand.accent },
  ];
  return bars
    .map(
      (bar, i) =>
        `<rect x="${x + i * (w + gap)}" y="${bottomY - bar.h}" width="${w}" height="${bar.h}" rx="2" fill="${bar.fill}"/>`,
    )
    .join("");
}

function motifWidth(scale) {
  return 5 * scale * 3 + 4 * scale * 2;
}

/**
 * RSS covers are often displayed at 150–300 px in podcast apps, so all
 * text elements are sized significantly larger than their social-post
 * counterparts for legibility at thumbnail scale.
 */
function buildMetrics() {
  const size = PODCAST_COVER_SIZE;
  const scale = size / 1080;
  // Larger boost: social posts use 1.25×, RSS covers need ~1.6× for readability
  const titleBoost = 1.6;

  // Slightly less art (0.60) to give the text panel more vertical room
  const artRatio = 0.6;
  const artH = Math.round(size * artRatio);
  const pad = Math.round(52 * scale);

  const titleSize = Math.round(46 * scale * titleBoost);
  const titleLineHeight = Math.round(54 * scale * titleBoost);
  const badgeH = Math.round(52 * scale); // was 40
  const badgeFontSize = Math.round(26 * scale); // was 18
  const badgeCharW = Math.round(20 * scale); // was 14
  const badgePadX = Math.round(22 * scale); // was 18
  const urlFontSize = Math.round(22 * scale); // was 16
  const footerGap = Math.round(14 * scale);
  const motifScale = 1.5 * scale; // was 1.15 — bigger bars
  const motifTallest = Math.round(28 * motifScale);
  const footerLogoMaxH = Math.round(52 * scale); // was 40
  const footerContentH = Math.max(motifTallest, footerLogoMaxH);
  const footerBottom = size - pad;
  const footerRowH = footerContentH + footerGap;
  const footerTop = footerBottom - footerRowH;
  const sectionGap = Math.round(18 * scale);
  const seamH = Math.round(96 * scale);
  const accentBarH = Math.round(5 * scale);

  return {
    size,
    scale,
    pad,
    artH,
    artW: size,
    seamH,
    textTop: artH + Math.round(pad * 0.35),
    textX: pad,
    titleSize,
    titleLineHeight,
    maxTitleLines: 3,
    maxTitleChars: 24,
    descSize: Math.round(28 * scale * 1.45),
    descLineHeight: Math.round(36 * scale * 1.45),
    maxDescLines: 2,
    maxDescChars: 40,
    badgeH,
    badgeFontSize,
    badgeCharW,
    badgePadX,
    urlFontSize,
    motifScale,
    motifTallest,
    footerLogoMaxH,
    footerContentH,
    footerBottom,
    footerRowH,
    footerTop,
    footerGap,
    sectionGap,
    accentBarH,
    accentBarTop: artH + Math.round(4 * scale),
    accentBarW: Math.round(120 * scale),
  };
}

function resolveBadgeStyle(brand, episodeFormat, theme) {
  if (episodeFormat && isSpecialSocialFormat(episodeFormat)) {
    const tokens = getFormatTokens(episodeFormat, theme);
    return { fill: tokens.color, text: tokens.text };
  }
  return { fill: brand.accent, text: brand.accentText };
}

function overlaySvg({ fonts, m, content, brand, badgeStyle }) {
  return Buffer.from(`
    <svg width="${m.size}" height="${m.size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${fontFaceStyles(fonts)}</style>
        <linearGradient id="seam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${brand.bg}" stop-opacity="0"/>
          <stop offset="100%" stop-color="${brand.bg}" stop-opacity="1"/>
        </linearGradient>
      </defs>

      <rect x="0" y="${m.artH - m.seamH}" width="${m.size}" height="${m.seamH}" fill="url(#seam)"/>
      <rect x="0" y="${m.artH}" width="${m.size}" height="${m.size - m.artH}" fill="${brand.bg}"/>

      <rect x="${m.pad}" y="${m.accentBarTop}" width="${m.accentBarW}" height="${m.accentBarH}" rx="2" fill="${badgeStyle.fill}"/>

      <rect x="${m.textX}" y="${content.badgeY}" width="${content.badgeW}" height="${m.badgeH}" rx="4" fill="${badgeStyle.fill}"/>
      <text
        x="${m.textX + m.badgePadX}"
        y="${content.badgeY + Math.round(m.badgeH * 0.68)}"
        fill="${badgeStyle.text}"
        font-family="'${FONTS.mono}', monospace"
        font-size="${m.badgeFontSize}"
        font-weight="500"
        letter-spacing="0.14em"
      >${escapeXml(content.badgeLabel)}</text>

      ${titleBlockSvg(m, content, brand)}
      ${descBlockSvg(m, content, brand)}

      ${footerMotifSvg(m, brand)}
    </svg>
  `);
}

function titleBlockSvg(m, content, brand) {
  if (content.titleLines.length === 0) return "";
  return `
    <text
      x="${m.textX}"
      y="${content.titleY + m.titleSize}"
      fill="${brand.primary}"
      font-family="'${FONTS.display}', sans-serif"
      font-size="${m.titleSize}"
      font-weight="800"
      letter-spacing="-0.02em"
    >${content.titleLines.map((line, i) => `<tspan x="${m.textX}" dy="${i === 0 ? 0 : m.titleLineHeight}">${escapeXml(line)}</tspan>`).join("")}</text>
  `;
}

function descBlockSvg(m, content, brand) {
  if (content.descLines.length === 0) return "";
  return `
    <text
      x="${m.textX}"
      y="${content.descStartY + m.descSize}"
      fill="${brand.muted}"
      font-family="'${FONTS.display}', sans-serif"
      font-size="${m.descSize}"
      font-weight="800"
      letter-spacing="-0.015em"
    >${content.descLines.map((line, i) => `<tspan x="${m.textX}" dy="${i === 0 ? 0 : m.descLineHeight}">${escapeXml(line)}</tspan>`).join("")}</text>
  `;
}

function footerMotifSvg(m, brand) {
  const scale = m.motifScale;
  const bottomY = m.footerBottom;
  const textX = m.textX + motifWidth(scale) + Math.round(10 * scale);
  return `
    ${motifBarsSvg(m.textX, bottomY, scale, brand)}
    <text
      x="${textX}"
      y="${bottomY}"
      dominant-baseline="alphabetic"
      fill="${brand.muted}"
      font-family="'${FONTS.mono}', monospace"
      font-size="${m.urlFontSize}"
      font-weight="500"
      letter-spacing="0.08em"
    >dekoder.fm</text>
  `;
}

function computeContent({ episodeId, title, subtitle = "", m, logoWidth, logoHeight }) {
  const hasSubtitle = Boolean(subtitle.trim());
  const maxTitleLines = hasSubtitle ? 1 : m.maxTitleLines;
  const titleLines = wrapLines(title, m.maxTitleChars).slice(0, maxTitleLines);
  const descLines = hasSubtitle
    ? wrapLines(subtitle, m.maxDescChars).slice(0, m.maxDescLines)
    : [];
  const badgeLabel = episodeId.toUpperCase();
  const badgeW = badgeLabel.length * m.badgeCharW + m.badgePadX * 2;
  const titleBlockH = titleLines.length * m.titleLineHeight;
  const descBlockH = descLines.length * m.descLineHeight;

  const badgeY = m.textTop;
  const titleY = badgeY + m.badgeH + Math.round(24 * m.scale);
  const descStartY = titleY + titleBlockH + Math.round(10 * m.scale);
  const textBlockH = m.badgeH + titleBlockH + (hasSubtitle ? descBlockH + Math.round(34 * m.scale) : 0);

  const maxTextBottom = m.footerTop - m.sectionGap;
  const clampedBadgeY = Math.max(
    m.textTop,
    Math.min(badgeY, maxTextBottom - textBlockH),
  );
  const clampedTitleY = clampedBadgeY + m.badgeH + Math.round(24 * m.scale);
  const clampedDescStartY = clampedTitleY + titleBlockH + Math.round(10 * m.scale);

  const logoX = m.size - m.pad - logoWidth;
  const logoY = m.footerBottom - logoHeight;

  return {
    badgeLabel,
    badgeW,
    badgeY: clampedBadgeY,
    titleLines,
    titleY: clampedTitleY,
    descLines,
    descStartY: clampedDescStartY,
    logoX,
    logoY,
  };
}

async function loadArtLayer(artPath, width, height, focalPoint, brand) {
  if (artPath && (await fileExists(artPath))) {
    return coverArt(artPath, width, height, focalPoint);
  }
  const bg = parseBgRgb(brand.bg);
  return sharp({
    create: { width, height, channels: 4, background: { ...bg, alpha: 1 } },
  })
    .composite([
      {
        input: Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="${brand.secondary}" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="${brand.accent}" stop-opacity="0.12"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>
      `),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

function parseBgRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * @param {object} options
 * @param {string} options.episodeId
 * @param {string} options.title
 * @param {string} [options.subtitle]
 * @param {string} [options.episodeFormat]
 * @param {string} [options.artPath]
 * @param {string|{x:number,y:number}} [options.artFocalPoint]
 * @param {string} [options.logoPath]
 * @param {"jpg"|"png"} [options.format]
 * @param {"dark"|"light"} [options.theme]
 */
export async function renderPodcastCover(options) {
  const {
    episodeId,
    title = "",
    subtitle = "",
    episodeFormat,
    artPath,
    artFocalPoint = "centre",
    logoPath,
    format = "jpg",
    theme = "dark",
  } = options;

  const brand = getBrand(theme);
  const resolvedLogoPath = logoPath ?? join(root, getLogoPath(theme));
  const m = buildMetrics();
  const fonts = await ensureFonts();

  const logoMeta = await sharp(resolvedLogoPath).metadata();
  const logoSourceW = logoMeta.width ?? 359;
  const logoSourceH = Math.min(LOGO_WORDMARK_HEIGHT, logoMeta.height ?? LOGO_WORDMARK_HEIGHT);
  const logoScale = m.footerLogoMaxH / logoSourceH;
  const logoH = Math.round(m.footerLogoMaxH);
  const logoW = Math.round(logoSourceW * logoScale);
  const logoBuf = await sharp(resolvedLogoPath)
    .extract({ left: 0, top: 0, width: logoSourceW, height: logoSourceH })
    .resize(logoW, logoH, { fit: "fill" })
    .png()
    .toBuffer();

  const content = computeContent({ episodeId, title, subtitle, m, logoWidth: logoW, logoHeight: logoH });
  const badgeStyle = resolveBadgeStyle(brand, episodeFormat, theme);

  const artBuf = await loadArtLayer(artPath, m.size, m.artH, artFocalPoint, brand);
  const overlayBuf = await sharp(
    overlaySvg({ fonts, m, content, brand, badgeStyle }),
  ).png().toBuffer();

  const bg = parseBgRgb(brand.bg);
  const base = sharp({
    create: { width: m.size, height: m.size, channels: 4, background: { ...bg, alpha: 1 } },
  })
    .composite([
      { input: artBuf, top: 0, left: 0 },
      { input: overlayBuf, top: 0, left: 0 },
      { input: logoBuf, top: content.logoY, left: content.logoX },
    ])
    .flatten({ background: bg });

  if (format === "png") {
    return base.png({ compressionLevel: 6, effort: 9, palette: false }).toBuffer();
  }
  return base
    .jpeg({ quality: 88, progressive: false, mozjpeg: false, chromaSubsampling: "4:2:0" })
    .toBuffer();
}

export { root as repoRoot };
