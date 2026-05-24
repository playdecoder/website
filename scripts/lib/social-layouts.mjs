/** Social post layout presets (platform-recommended dimensions). */

export const LAYOUTS = {
  "ig-post": {
    id: "ig-post",
    label: "Instagram post",
    width: 1080,
    height: 1080,
    artMode: "top",
    artRatio: 0.63,
  },
  "ig-story": {
    id: "ig-story",
    label: "Instagram story",
    width: 1080,
    height: 1920,
    artMode: "top",
    artRatio: 0.68,
  },
  "facebook-post": {
    id: "facebook-post",
    label: "Facebook post",
    width: 1200,
    height: 630,
    artMode: "left",
    artRatio: 0.48,
  },
  "linkedin-post": {
    id: "linkedin-post",
    label: "LinkedIn post",
    width: 1200,
    height: 627,
    artMode: "left",
    artRatio: 0.48,
  },
  "youtube-keyart": {
    id: "youtube-keyart",
    label: "YouTube keyart",
    width: 1920,
    height: 1080,
    artMode: "backdrop",
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

export const DEFAULT_LAYOUT = "ig-post";

export function resolveLayout(id) {
  const layout = LAYOUTS[id];
  if (!layout) {
    throw new Error(`Unknown layout "${id}". Choose: ${LAYOUT_IDS.join(", ")}`);
  }
  return layout;
}

/** Derive typography and placement from canvas size + art mode. */
export function buildLayoutMetrics(layout) {
  const { width, height, artMode, artRatio } = layout;
  const pad = Math.round(Math.min(width, height) * 0.052);
  const scale = width / 1080;

  const metrics = {
    width,
    height,
    pad,
    scale,
    artMode,
    titleSize: Math.round(46 * scale),
    titleLineHeight: Math.round(54 * scale),
    descSize: Math.round(24 * scale),
    descLineHeight: Math.round(34 * scale),
    badgeH: Math.round(40 * scale),
    badgeFontSize: Math.round(18 * scale),
    badgeCharW: Math.round(14 * scale),
    badgePadX: Math.round(18 * scale),
    urlFontSize: Math.round(16 * scale),
    footerGap: Math.round(12 * scale),
    sectionGap: Math.round(18 * scale),
    maxTitleLines: height > 1500 ? 4 : 3,
    maxDescLines: 2,
  };

  metrics.motifScale = 1.15 * scale;
  metrics.motifTallest = Math.round(28 * metrics.motifScale);
  metrics.footerLogoMaxH = Math.round(40 * scale);
  metrics.footerContentH = Math.max(metrics.motifTallest, metrics.footerLogoMaxH);
  metrics.footerBottom = height - pad;
  metrics.footerRowH = metrics.footerContentH + metrics.footerGap;
  metrics.footerTop = metrics.footerBottom - metrics.footerRowH;
  metrics.footerCenterY = metrics.footerBottom - metrics.footerContentH / 2;
  metrics.footerLogoOffsetY = Math.round(3 * scale);

  if (layout.id === "ig-story") {
    const boost = 1.4;
    metrics.titleSize = Math.round(46 * scale * boost);
    metrics.titleLineHeight = Math.round(54 * scale * boost);
    metrics.descSize = Math.round(28 * scale * boost);
    metrics.descLineHeight = Math.round(38 * scale * boost);
    metrics.badgeH = Math.round(44 * scale * boost);
    metrics.badgeFontSize = Math.round(20 * scale * boost);
    metrics.badgeCharW = Math.round(15 * scale * boost);
    metrics.urlFontSize = Math.round(18 * scale * boost);
    metrics.footerLogoMaxH = Math.round(44 * scale * boost);
    metrics.motifScale = 1.15 * scale * boost;
    metrics.motifTallest = Math.round(28 * metrics.motifScale);
    metrics.footerContentH = Math.max(metrics.motifTallest, metrics.footerLogoMaxH);
    metrics.footerRowH = metrics.footerContentH + metrics.footerGap;
    metrics.footerTop = metrics.footerBottom - metrics.footerRowH;
    metrics.footerCenterY = metrics.footerBottom - metrics.footerContentH / 2;
  }

  if (artMode === "top") {
    metrics.artHeight = Math.round(height * artRatio);
    metrics.artWidth = width;
    metrics.seamH = Math.round(96 * scale);
    metrics.textTop = metrics.artHeight + Math.round(pad * 0.35);
    metrics.textX = pad;
    metrics.maxTitleChars = height > 1500 ? 32 : 28;
    metrics.maxDescChars = height > 1500 ? 48 : 42;
    metrics.accentLine = {
      axis: "h",
      top: metrics.artHeight + Math.round(4 * scale),
      width,
      height: Math.round(4 * scale),
      barW: Math.round(120 * scale),
      barX: pad,
    };
  } else if (artMode === "backdrop") {
    metrics.artWidth = width;
    metrics.artHeight = height;
    metrics.textX = pad;
    metrics.titleSize = Math.round(40 * scale);
    metrics.titleLineHeight = Math.round(48 * scale);
    metrics.maxTitleChars = 24;
    metrics.maxDescChars = 44;
    metrics.maxTitleLines = 2;
    metrics.textMaxWidthRatio = 0.62;
    metrics.vignetteTop = Math.round(height * 0.22);
    metrics.vignetteBottom = Math.round(height * 0.66);
    metrics.accentLine = {
      axis: "h",
      width,
      height: Math.round(4 * scale),
      barW: Math.round(140 * scale),
      barX: pad,
    };
  } else {
    metrics.artWidth = Math.round(width * artRatio);
    metrics.artHeight = height;
    metrics.textX = metrics.artWidth + pad;
    metrics.textWidth = width - metrics.artWidth - pad * 2;
    metrics.textTop = pad + Math.round(12 * scale);
    metrics.maxTitleChars = 22;
    metrics.maxDescChars = 34;
    metrics.maxTitleLines = 3;
    metrics.seamW = Math.round(72 * scale);
    metrics.accentLine = {
      axis: "v",
      left: metrics.artWidth,
      width: Math.round(4 * scale),
      barH: Math.round(80 * scale),
      barY: pad,
    };
  }

  return metrics;
}
