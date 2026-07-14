import { join } from "node:path";

import sharp from "sharp";

import { getFormatTokens } from "./format-tokens.mjs";
import { getBrand, getLogoPath, LOGO_WORDMARK_HEIGHT, FONTS } from "./social-brand.mjs";
import { composeFormatPortraitArt } from "./social-format-art.mjs";
import {
  computeContentLayout,
  ensureFonts,
  fontFaceStyles,
  footerBrandSvg,
  repoRoot,
  textBlockSvg,
  wrapLines,
} from "./social-frame.mjs";
import { buildLayoutMetrics, DEFAULT_LAYOUT, resolveLayout } from "./social-layouts.mjs";

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function applyFormatLeftMetrics(m, artWidth) {
  m.formatArtStyle = "column";
  m.artMode = "left";
  m.artWidth = artWidth;
  m.artHeight = m.height;
  m.textX = artWidth + m.pad;
  m.textWidth = m.width - artWidth - m.pad * 2;
  m.textTop = m.pad + Math.round(12 * m.scale);
  m.seamW = Math.round(88 * m.scale);
  m.accentLine = {
    axis: "v",
    left: artWidth,
    width: Math.round(4 * m.scale),
    barH: Math.round(96 * m.scale),
    barY: m.pad,
  };
}

function buildFormatLayoutMetrics(layout) {
  const m = buildLayoutMetrics(layout);
  m.specialFormat = true;
  delete m.maxDescLines;

  if (layout.id === "ig-post") {
    applyFormatLeftMetrics(m, Math.round(m.width * 0.46));
    m.titleSize = Math.round(42 * m.scale);
    m.titleLineHeight = Math.round(48 * m.scale);
    m.descSize = Math.round(26 * m.scale);
    m.descLineHeight = Math.round(36 * m.scale);
    m.titleCharsScale = 0.74;
    m.descCharsScale = 0.8;
    m.maxTitleLines = 5;
    m.textVerticalAlign = "center";
    return m;
  }

  if (layout.id === "youtube-keyart") {
    applyFormatLeftMetrics(m, m.height);
    m.titleSize = Math.round(32 * m.scale);
    m.titleLineHeight = Math.round(40 * m.scale);
    m.descSize = Math.round(21 * m.scale);
    m.descLineHeight = Math.round(29 * m.scale);
    m.maxTitleLines = 5;
    return m;
  }

  if (layout.id === "ig-story") {
    m.formatArtStyle = "banner";
    m.artMode = "top";
    m.artHeight = Math.round(m.height * 0.56);
    m.artWidth = m.width;
    m.seamH = Math.round(120 * m.scale);
    m.textTop = m.artHeight + Math.round(m.pad * 0.28);
    m.textX = m.pad;
    m.maxTitleLines = 4;
    m.accentLine = {
      axis: "h",
      top: m.artHeight + Math.round(4 * m.scale),
      width: m.width,
      height: Math.round(4 * m.scale),
      barW: Math.round(140 * m.scale),
      barX: m.pad,
    };
    return m;
  }

  if (layout.artMode === "left") {
    applyFormatLeftMetrics(m, Math.round(m.height));
    return m;
  }

  m.formatArtStyle = "banner";
  return m;
}

function computeFormatContentLayout({
  episodeId,
  formatLabel,
  formatOrdinal,
  title,
  description,
  m,
  logoWidth,
  logoHeight,
}) {
  const base = computeContentLayout({
    episodeId,
    title,
    description,
    m,
    logoWidth,
    logoHeight,
  });

  const formatBadgeLabel = `${formatLabel} #${formatOrdinal}`.toUpperCase();
  const textRightLimit =
    m.artMode === "left" && m.textWidth ? m.textX + m.textWidth : base.textRightLimit;

  return {
    ...base,
    textRightLimit,
    formatBadgeLabel,
    formatBadgeW: formatBadgeLabel.length * Math.round(m.badgeCharW * 0.9) + m.badgePadX * 2,
  };
}

function formatBackgroundDefs(m, brand) {
  if (m.artMode === "left") {
    return {
      defs: `
        <linearGradient id="format-seam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${brand.bg}" stop-opacity="0"/>
          <stop offset="100%" stop-color="${brand.bg}" stop-opacity="1"/>
        </linearGradient>
      `,
      rects: `
        <rect x="${m.artWidth - m.seamW}" y="0" width="${m.seamW}" height="${m.height}" fill="url(#format-seam)"/>
        <rect x="${m.artWidth}" y="0" width="${m.width - m.artWidth}" height="${m.height}" fill="${brand.bg}"/>
      `,
    };
  }

  const seamH = Math.min(m.seamH, m.artHeight);
  return {
    defs: `
      <linearGradient id="format-seam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${brand.bg}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${brand.bg}" stop-opacity="1"/>
      </linearGradient>
    `,
    rects: `
      <rect x="0" y="${m.artHeight - seamH}" width="${m.width}" height="${seamH}" fill="url(#format-seam)"/>
      <rect x="0" y="${m.artHeight}" width="${m.width}" height="${m.height - m.artHeight}" fill="${brand.bg}"/>
    `,
  };
}

function formatOverlaySvg({ fonts, m, content, brand, formatTokens }) {
  const bg = formatBackgroundDefs(m, brand);
  const textClipW = Math.max(0, content.textRightLimit - m.textX);
  const clipDef =
    textClipW <= 0
      ? ""
      : `<clipPath id="text-clip"><rect x="${m.textX}" y="0" width="${textClipW}" height="${m.height}"/></clipPath>`;
  const clipAttr = clipDef ? ' clip-path="url(#text-clip)"' : "";

  return Buffer.from(`
    <svg width="${m.width}" height="${m.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${fontFaceStyles(fonts)}</style>
        ${bg.defs}
        ${clipDef}
      </defs>

      ${bg.rects}

      <g${clipAttr}>
        <rect x="${m.textX}" y="${content.badgeY}" width="${content.formatBadgeW}" height="${m.badgeH}" rx="4" fill="${formatTokens.color}"/>
        <text
          x="${m.textX + m.badgePadX}"
          y="${content.badgeY + Math.round(m.badgeH * 0.68)}"
          fill="${formatTokens.text}"
          font-family="'${FONTS.mono}', monospace"
          font-size="${Math.round(m.badgeFontSize * 0.94)}"
          font-weight="500"
          letter-spacing="0.1em"
        >${escapeXml(content.formatBadgeLabel)}</text>

        <rect
          x="${m.textX + content.formatBadgeW + Math.round(10 * m.scale)}"
          y="${content.badgeY}"
          width="${content.badgeW}"
          height="${m.badgeH}"
          rx="4"
          fill="${brand.accent}"
        />
        <text
          x="${m.textX + content.formatBadgeW + Math.round(10 * m.scale) + m.badgePadX}"
          y="${content.badgeY + Math.round(m.badgeH * 0.68)}"
          fill="${brand.accentText}"
          font-family="'${FONTS.mono}', monospace"
          font-size="${m.badgeFontSize}"
          font-weight="500"
          letter-spacing="0.14em"
        >${escapeXml(content.badgeLabel)}</text>

        ${textBlockSvg({ x: m.textX, y: content.titleY, lines: content.titleLines, lineHeight: m.titleLineHeight, fontSize: m.titleSize, fill: brand.primary })}
        ${textBlockSvg({ x: m.textX, y: content.descStartY, lines: content.descLines, lineHeight: m.descLineHeight, fontSize: m.descSize, fill: brand.muted })}
      </g>

      ${footerBrandSvg(m, brand)}
    </svg>
  `);
}

function formatAccentLineSvg(m, formatAccent) {
  const a = m.accentLine;
  const accent = formatAccent;
  if (a.axis === "h") {
    return Buffer.from(`
      <svg width="${a.width}" height="${a.height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${a.barX}" y="0" width="${a.barW}" height="${a.height}" rx="2" fill="${accent}"/>
      </svg>
    `);
  }
  return Buffer.from(`
    <svg width="${a.width}" height="${a.barH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${a.width}" height="${a.barH}" rx="2" fill="${accent}"/>
    </svg>
  `);
}

export async function renderFormatSocialFrame(options) {
  const {
    episodeId,
    title,
    description,
    artPath,
    artFocalPoint = "centre",
    logoPath,
    layout: layoutId = DEFAULT_LAYOUT,
    theme = "dark",
    format = "spotlight",
    formatLabel = "Spotlight",
    formatOrdinal = 1,
    hostName = "",
  } = options;

  const brand = getBrand(theme);
  const formatTokens = getFormatTokens(format, theme);
  const resolvedLogoPath = logoPath ?? join(repoRoot, getLogoPath(theme));
  const layout = resolveLayout(layoutId);
  const m = buildFormatLayoutMetrics(layout);
  const fonts = await ensureFonts();

  const logoMeta = await sharp(resolvedLogoPath).metadata();
  const logoSourceW = logoMeta.width ?? 359;
  const logoSourceH = Math.min(LOGO_WORDMARK_HEIGHT, logoMeta.height ?? LOGO_WORDMARK_HEIGHT);
  const logoTargetH = m.footerLogoMaxH;
  const logoScale = logoTargetH / logoSourceH;
  const logoH = Math.round(logoTargetH);
  const logoW = Math.round(logoSourceW * logoScale);

  const logoBuf = await sharp(resolvedLogoPath)
    .extract({ left: 0, top: 0, width: logoSourceW, height: logoSourceH })
    .resize(logoW, logoH, { fit: "fill" })
    .png()
    .toBuffer();

  const content = computeFormatContentLayout({
    episodeId,
    formatLabel,
    formatOrdinal,
    title,
    description,
    m,
    logoWidth: logoW,
    logoHeight: logoH,
  });

  const artBuf = await composeFormatPortraitArt({
    artPath,
    m,
    focalPoint: artFocalPoint,
    brand,
    hostName,
    formatAccent: formatTokens.color,
  });

  const overlayBuf = await sharp(formatOverlaySvg({ fonts, m, content, brand, formatTokens }))
    .png()
    .toBuffer();
  const accentLine = formatAccentLineSvg(m, formatTokens.color);

  const composites = [
    { input: artBuf, top: 0, left: 0 },
    { input: overlayBuf, top: 0, left: 0 },
  ];

  if (m.accentLine.axis === "h") {
    composites.push({ input: accentLine, top: content.accentTop, left: 0 });
  } else {
    composites.push({ input: accentLine, top: content.accentTop, left: m.accentLine.left });
  }

  composites.push({ input: logoBuf, top: content.logoY, left: content.logoX });

  return sharp({
    create: { width: m.width, height: m.height, channels: 4, background: brand.bg },
  })
    .composite(composites)
    .png({ compressionLevel: 6, effort: 9, palette: false })
    .toBuffer();
}

export { buildFormatLayoutMetrics, wrapLines };
