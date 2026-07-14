import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { isSpecialSocialFormat } from "./format-tokens.mjs";
import { FONTS, getBrand, getLogoPath, LOGO_WORDMARK_HEIGHT } from "./social-brand.mjs";
import {
  buildLayoutMetrics,
  DEFAULT_LAYOUT,
  LAYOUT_IDS,
  LAYOUTS,
  resolveLayout,
} from "./social-layouts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const fontsDir = join(__dirname, "../assets/fonts");

const FONT_SPECS = [
  {
    id: "syne-800",
    family: "Syne",
    weight: 800,
    cssUrl: "https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap",
  },
  {
    id: "jetbrains-mono-500",
    family: "JetBrains Mono",
    weight: 500,
    cssUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap",
  },
];

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchFontCss(cssUrl) {
  const cssRes = await fetch(cssUrl, { headers: { "User-Agent": CHROME_UA } });
  if (!cssRes.ok) throw new Error(`Failed to fetch font CSS: ${cssRes.status}`);
  return cssRes.text();
}

function pickWoff2Url(css) {
  for (const block of ["latin-ext", "latin"]) {
    const re = new RegExp(`/\\* ${block} \\*/[\\s\\S]*?url\\((https:[^)]+\\.woff2)\\)`, "i");
    const match = css.match(re);
    if (match) return match[1];
  }
  const fallback = css.match(/url\((https:[^)]+\.woff2)\)/);
  if (fallback) return fallback[1];
  throw new Error("Could not parse woff2 URL from font CSS");
}

async function ensureFonts() {
  await mkdir(fontsDir, { recursive: true });
  const loaded = {};

  for (const spec of FONT_SPECS) {
    const cachePath = join(fontsDir, `${spec.id}.woff2`);
    let bytes;

    if (await fileExists(cachePath)) {
      bytes = await readFile(cachePath);
    } else {
      const css = await fetchFontCss(spec.cssUrl);
      const woff2Url = pickWoff2Url(css);
      const fontRes = await fetch(woff2Url);
      if (!fontRes.ok) throw new Error(`Failed to download ${spec.family}: ${fontRes.status}`);
      bytes = Buffer.from(await fontRes.arrayBuffer());
      await writeFile(cachePath, bytes);
    }

    loaded[spec.id] = bytes.toString("base64");
  }

  return loaded;
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

function estimateCharsPerLine(textWidth, fontSize, scale = 0.68) {
  if (textWidth <= 0) return 24;
  // Syne 800 runs wide; stay conservative so lines don't clip in SVG.
  return Math.max(12, Math.floor(textWidth / (fontSize * scale)));
}

function resolveTextWidth(m, textRightLimit) {
  if (m.textWidth != null) return m.textWidth;
  return Math.max(0, textRightLimit - m.textX);
}

function capLineCount(lines, maxLines) {
  if (maxLines == null) return lines;
  return lines.slice(0, maxLines);
}

function layoutTextPositions(m, titleBlockH, descBlockH) {
  let badgeY;
  let titleY;
  let descStartY;
  let accentTop;

  if (m.artMode === "backdrop") {
    const descBottom = m.footerTop - m.sectionGap;
    descStartY = descBottom - descBlockH;
    const titleBottom = descStartY - m.sectionGap;
    titleY = titleBottom - titleBlockH;
    badgeY = titleY - m.sectionGap - m.badgeH;
    accentTop = badgeY - Math.round(14 * m.scale);
  } else if (m.artMode === "top") {
    badgeY = m.textTop;
    titleY = badgeY + m.badgeH + Math.round(32 * m.scale);
    descStartY = titleY + titleBlockH + Math.round(16 * m.scale);

    if (descStartY + descBlockH + m.sectionGap > m.footerTop) {
      descStartY = m.footerTop - m.sectionGap - descBlockH;
      titleY = descStartY - Math.round(16 * m.scale) - titleBlockH;
      badgeY = titleY - Math.round(32 * m.scale) - m.badgeH;
    }
    accentTop = m.accentLine.top;
  } else {
    badgeY = m.textTop;
    titleY = badgeY + m.badgeH + Math.round(24 * m.scale);
    descStartY = titleY + titleBlockH + Math.round(14 * m.scale);

    if (descStartY + descBlockH + m.sectionGap > m.footerTop) {
      descStartY = m.footerTop - m.sectionGap - descBlockH;
      titleY = descStartY - Math.round(14 * m.scale) - titleBlockH;
      badgeY = Math.max(m.textTop, titleY - Math.round(24 * m.scale) - m.badgeH);
    } else if (m.textVerticalAlign === "center") {
      const gapAfterBadge = Math.round(24 * m.scale);
      const gapAfterTitle = Math.round(14 * m.scale);
      const blockH = m.badgeH + gapAfterBadge + titleBlockH + gapAfterTitle + descBlockH;
      const availableH = m.footerTop - m.textTop - m.sectionGap;
      const offsetY = Math.max(0, Math.round((availableH - blockH) / 2));
      badgeY = m.textTop + offsetY;
      titleY = badgeY + m.badgeH + gapAfterBadge;
      descStartY = titleY + titleBlockH + gapAfterTitle;
    }
    accentTop = m.accentLine.barY;
  }

  return { badgeY, titleY, descStartY, accentTop };
}

function fitDescriptionLines(description, m, descStartY, descCharsPerLine) {
  const availableDescH = Math.max(0, m.footerTop - descStartY - m.sectionGap);
  const maxFitLines = Math.max(1, Math.floor(availableDescH / m.descLineHeight));
  const lineCap = m.maxDescLines != null ? Math.min(m.maxDescLines, maxFitLines) : maxFitLines;
  return capLineCount(wrapLines(description, descCharsPerLine), lineCap);
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

function motifWidth(scale) {
  const w = 5 * scale;
  const gap = 4 * scale;
  return w * 3 + gap * 2;
}

function barMotifSvg(x, bottomY, scale = 1, brand) {
  const w = 5 * scale;
  const gap = 4 * scale;
  const bars = [
    { h: 20 * scale, fill: brand.accent },
    { h: 28 * scale, fill: brand.secondary },
    { h: 14 * scale, fill: brand.accent },
  ];
  return bars
    .map((bar, i) => {
      const bx = x + i * (w + gap);
      return `<rect x="${bx}" y="${bottomY - bar.h}" width="${w}" height="${bar.h}" rx="2" fill="${bar.fill}"/>`;
    })
    .join("");
}

function footerBrandSvg(m, brand) {
  const scale = m.motifScale;
  const bottomY = m.footerBottom;
  const textX = m.textX + motifWidth(scale) + Math.round(10 * scale);

  return `
    ${barMotifSvg(m.textX, bottomY, scale, brand)}
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

function computeContentLayout({ episodeId, title, description, m, logoWidth, logoHeight }) {
  const badgeLabel = episodeId.toUpperCase();
  const badgeW = badgeLabel.length * m.badgeCharW + m.badgePadX * 2;

  const logoX = m.width - m.pad - logoWidth;
  const logoY = m.footerBottom - logoHeight + (m.footerLogoOffsetY ?? 0);

  const textRightLimit =
    m.artMode === "backdrop"
      ? m.textX + Math.round(m.width * (m.textMaxWidthRatio ?? 0.62))
      : m.width - m.pad;

  const textWidth = resolveTextWidth(m, textRightLimit);
  const titleCharsPerLine =
    m.maxTitleChars ?? estimateCharsPerLine(textWidth, m.titleSize, m.titleCharsScale ?? 0.68);
  const descCharsPerLine =
    m.maxDescChars ?? estimateCharsPerLine(textWidth, m.descSize, m.descCharsScale ?? 0.76);

  const titleLines = capLineCount(wrapLines(title, titleCharsPerLine), m.maxTitleLines);
  const titleBlockH = titleLines.length * m.titleLineHeight;

  let badgeY;
  let titleY;
  let descStartY;
  let accentTop;
  let descLines;
  let descBlockH;

  if (m.textVerticalAlign === "center" && m.artMode === "left") {
    const gapAfterBadge = Math.round(24 * m.scale);
    const gapAfterTitle = Math.round(14 * m.scale);
    const fixedBlockH = m.badgeH + gapAfterBadge + titleBlockH + gapAfterTitle;
    const availableDescH = Math.max(0, m.footerTop - m.textTop - m.sectionGap - fixedBlockH);
    const maxFitLines = Math.max(1, Math.floor(availableDescH / m.descLineHeight));
    descLines = capLineCount(wrapLines(description, descCharsPerLine), maxFitLines);
    descBlockH = descLines.length * m.descLineHeight;
    ({ badgeY, titleY, descStartY, accentTop } = layoutTextPositions(m, titleBlockH, descBlockH));
  } else {
    ({ badgeY, titleY, descStartY, accentTop } = layoutTextPositions(
      m,
      titleBlockH,
      m.descLineHeight,
    ));

    descLines = fitDescriptionLines(description, m, descStartY, descCharsPerLine);
    descBlockH = descLines.length * m.descLineHeight;

    if (descStartY + descBlockH + m.sectionGap > m.footerTop) {
      ({ badgeY, titleY, descStartY, accentTop } = layoutTextPositions(m, titleBlockH, descBlockH));
      descLines = fitDescriptionLines(description, m, descStartY, descCharsPerLine);
      descBlockH = descLines.length * m.descLineHeight;
    }
  }

  return {
    badgeLabel,
    badgeW,
    badgeY,
    titleLines,
    titleY,
    descLines,
    descStartY,
    textRightLimit,
    logoX,
    logoY,
    accentTop,
  };
}

function textBlockSvg({ x, y, lines, lineHeight, fontSize, fill }) {
  if (lines.length === 0) return "";
  return `
    <text
      x="${x}"
      y="${y + fontSize}"
      fill="${fill}"
      font-family="'${FONTS.display}', sans-serif"
      font-size="${fontSize}"
      font-weight="800"
      letter-spacing="-0.02em"
    >${lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("")}</text>
  `;
}

function seamGradientDef(id, axis, brand) {
  const vector =
    axis === "h"
      ? `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">`
      : `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">`;
  return `
    ${vector}
      <stop offset="0%" stop-color="${brand.bg}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${brand.bg}" stop-opacity="1"/>
    </linearGradient>
  `;
}

function backgroundDefsAndRects(m, content, brand) {
  if (m.artMode === "backdrop") {
    const vignetteTopY = content?.accentTop ?? m.height - m.vignetteBottom;
    const vignetteBottomH = m.height - vignetteTopY;

    return {
      defs: `
        <linearGradient id="vignette-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${brand.bg}" stop-opacity="0.72"/>
          <stop offset="100%" stop-color="${brand.bg}" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="vignette-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${brand.bg}" stop-opacity="0"/>
          <stop offset="22%" stop-color="${brand.bg}" stop-opacity="0.76"/>
          <stop offset="45%" stop-color="${brand.bg}" stop-opacity="0.91"/>
          <stop offset="100%" stop-color="${brand.bg}" stop-opacity="1"/>
        </linearGradient>
      `,
      rects: `
        <rect x="0" y="0" width="${m.width}" height="${m.vignetteTop}" fill="url(#vignette-top)"/>
        <rect x="0" y="${vignetteTopY}" width="${m.width}" height="${vignetteBottomH}" fill="url(#vignette-bottom)"/>
      `,
    };
  }

  if (m.artMode === "left") {
    return {
      defs: seamGradientDef("seam", "h", brand),
      rects: `
        <rect x="${m.artWidth - m.seamW}" y="0" width="${m.seamW}" height="${m.height}" fill="url(#seam)"/>
        <rect x="${m.artWidth}" y="0" width="${m.width - m.artWidth}" height="${m.height}" fill="${brand.bg}"/>
      `,
    };
  }

  const seamH = Math.min(m.seamH, m.artHeight);

  return {
    defs: seamGradientDef("seam", "v", brand),
    rects: `
      <rect x="0" y="${m.artHeight - seamH}" width="${m.width}" height="${seamH}" fill="url(#seam)"/>
      <rect x="0" y="${m.artHeight}" width="${m.width}" height="${m.height - m.artHeight}" fill="${brand.bg}"/>
    `,
  };
}

function overlaySvg({ fonts, m, content, brand }) {
  const bg = backgroundDefsAndRects(m, content, brand);
  const textClipW = Math.max(0, content.textRightLimit - m.textX);
  const clipDef =
    textClipW > 0
      ? `<clipPath id="text-clip"><rect x="${m.textX}" y="0" width="${textClipW}" height="${m.height}"/></clipPath>`
      : "";

  return Buffer.from(`
    <svg width="${m.width}" height="${m.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${fontFaceStyles(fonts)}</style>
        ${bg.defs}
        ${clipDef}
      </defs>

      ${bg.rects}

      <g${textClipW > 0 ? ' clip-path="url(#text-clip)"' : ""}>
        <rect x="${m.textX}" y="${content.badgeY}" width="${content.badgeW}" height="${m.badgeH}" rx="4" fill="${brand.accent}"/>
        <text
          x="${m.textX + m.badgePadX}"
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

function accentLineSvg(m, brand) {
  const a = m.accentLine;
  if (a.axis === "h") {
    return Buffer.from(`
      <svg width="${a.width}" height="${a.height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${a.barX}" y="0" width="${a.barW}" height="${a.height}" rx="2" fill="${brand.secondary}"/>
      </svg>
    `);
  }
  return Buffer.from(`
    <svg width="${a.width}" height="${a.barH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${a.width}" height="${a.barH}" rx="2" fill="${brand.secondary}"/>
    </svg>
  `);
}

async function coverArt(artPath, w, h, focalPoint = "centre") {
  const focal = normalizeArtFocalPoint(focalPoint);

  if (typeof focal === "string") {
    return sharp(artPath).resize(w, h, { fit: "cover", position: focal }).png().toBuffer();
  }

  const meta = await sharp(artPath).metadata();
  const srcW = meta.width ?? w;
  const srcH = meta.height ?? h;
  const scale = Math.max(w / srcW, h / srcH);
  const scaledW = Math.round(srcW * scale);
  const scaledH = Math.round(srcH * scale);
  const left = Math.max(0, Math.min(scaledW - w, Math.round((scaledW - w) * focal.x)));
  const top = Math.max(0, Math.min(scaledH - h, Math.round((scaledH - h) * focal.y)));

  return sharp(artPath)
    .resize(scaledW, scaledH)
    .extract({ left, top, width: w, height: h })
    .png()
    .toBuffer();
}

const SHARP_GRAVITY = new Set([
  "centre",
  "center",
  "top",
  "right top",
  "right",
  "right bottom",
  "bottom",
  "left bottom",
  "left",
  "left top",
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
  "attention",
  "entropy",
]);

function normalizeArtFocalPoint(focal) {
  if (typeof focal === "string") {
    const key = focal.toLowerCase();
    if (key === "center") return "centre";
    if (SHARP_GRAVITY.has(key)) return key;
    throw new Error(
      `Unknown artFocalPoint "${focal}". Use a sharp gravity name or { x, y } (0–1).`,
    );
  }

  if (focal && typeof focal.x === "number" && typeof focal.y === "number") {
    return {
      x: Math.min(1, Math.max(0, focal.x)),
      y: Math.min(1, Math.max(0, focal.y)),
    };
  }

  return "centre";
}

async function loadArtLayer(artPath, m, focalPoint = "centre", brand) {
  const w = m.artWidth;
  const h = m.artHeight;

  if (artPath && (await fileExists(artPath))) {
    return coverArt(artPath, w, h, focalPoint);
  }

  return sharp({
    create: { width: w, height: h, channels: 4, background: brand.bg },
  })
    .composite([
      {
        input: Buffer.from(`
          <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="${brand.secondary}" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="${brand.accent}" stop-opacity="0.12"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)"/>
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
              fill="${brand.muted}" font-family="sans-serif" font-size="${Math.round(22 * m.scale)}" letter-spacing="0.12em">
              DROP ART INTO public/social/art/
            </text>
          </svg>
        `),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}

export async function renderSocialFrame(options) {
  const { format = "normal", ...rest } = options;
  if (isSpecialSocialFormat(format)) {
    const { renderFormatSocialFrame } = await import("./social-format-frame.mjs");
    return renderFormatSocialFrame({ format, ...rest });
  }

  const {
    episodeId,
    title,
    description,
    artPath,
    artFocalPoint = "centre",
    logoPath,
    layout: layoutId = DEFAULT_LAYOUT,
    theme = "dark",
  } = rest;

  const brand = getBrand(theme);
  const resolvedLogoPath = logoPath ?? join(root, getLogoPath(theme));
  const layout = resolveLayout(layoutId);
  const m = buildLayoutMetrics(layout);
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

  const content = computeContentLayout({
    episodeId,
    title,
    description,
    m,
    logoWidth: logoW,
    logoHeight: logoH,
  });

  const overlayBuf = await sharp(overlaySvg({ fonts, m, content, brand })).png().toBuffer();
  const artBuf = await loadArtLayer(artPath, m, artFocalPoint, brand);
  const accentLine = accentLineSvg(m, brand);

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

export {
  root as repoRoot,
  LAYOUTS,
  LAYOUT_IDS,
  DEFAULT_LAYOUT,
  resolveLayout,
  ensureFonts,
  coverArt,
  normalizeArtFocalPoint,
  fontFaceStyles,
  wrapLines,
  computeContentLayout,
  textBlockSvg,
  footerBrandSvg,
  motifWidth,
  accentLineSvg,
};
