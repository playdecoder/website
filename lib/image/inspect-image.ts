/**
 * Reads technical specs from the first bytes of an image file (PNG, JPEG, WebP, GIF, AVIF).
 * Header-only: callers pass a prefix of the file (a range request is enough), never pixel data.
 */

export type ImageFormat = "PNG" | "JPEG" | "WebP" | "GIF" | "AVIF" | "unknown";

export interface ImageSpecs {
  format: ImageFormat;
  width: number | null;
  height: number | null;
  /** Bits per channel. */
  bitDepth: number | null;
  /** Bits per pixel across all channels (or palette index size). */
  bitsPerPixel: number | null;
  colorMode: string | null;
  hasAlpha: boolean | null;
  /** Encoder details worth seeing at review time: progressive, chroma subsampling, lossless… */
  encoding: string[];
  /** ICC profile description, "sRGB" for a PNG sRGB chunk, null when nothing is embedded. */
  colorProfile: string | null;
  animated: boolean;
}

function emptySpecs(format: ImageFormat): ImageSpecs {
  return {
    format,
    width: null,
    height: null,
    bitDepth: null,
    bitsPerPixel: null,
    colorMode: null,
    hasAlpha: null,
    encoding: [],
    colorProfile: null,
    animated: false,
  };
}

function u32be(b: Uint8Array, o: number) {
  return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
}

function u16be(b: Uint8Array, o: number) {
  return (b[o] << 8) | b[o + 1];
}

function u16le(b: Uint8Array, o: number) {
  return b[o] | (b[o + 1] << 8);
}

function u24le(b: Uint8Array, o: number) {
  return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
}

function u32le(b: Uint8Array, o: number) {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

function ascii(b: Uint8Array, o: number, n: number) {
  let out = "";
  for (let i = o; i < Math.min(b.length, o + n); i++) out += String.fromCharCode(b[i]);
  return out;
}

/** Compact ICC profiles (libvips, sharp) use terse descriptions. */
const ICC_ALIASES: Record<string, string> = {
  sP3C: "Display P3",
  sRGB: "sRGB",
  sGry: "Gray (sRGB gamma)",
};

function cleanText(text: string) {
  // oxlint-disable-next-line no-control-regex -- ICC strings are NUL-padded
  return text.replace(/\u0000+/g, "").trim() || null;
}

async function inflateZlib(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const stream = new Blob([new Uint8Array(data)])
      .stream()
      .pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

/** Human-readable name from an ICC profile's `desc` tag (v2 `desc` or v4 `mluc`). */
export function iccProfileDescription(icc: Uint8Array): string | null {
  if (icc.length < 132) return null;
  const tagCount = u32be(icc, 128);
  for (let i = 0; i < tagCount; i++) {
    const entry = 132 + i * 12;
    if (entry + 12 > icc.length) return null;
    if (ascii(icc, entry, 4) !== "desc") continue;
    const offset = u32be(icc, entry + 4);
    const size = u32be(icc, entry + 8);
    if (size < 12 || offset + size > icc.length) return null;
    const type = ascii(icc, offset, 4);
    if (type === "desc") {
      const length = u32be(icc, offset + 8);
      const name = cleanText(ascii(icc, offset + 12, Math.max(0, length - 1)));
      return name ? (ICC_ALIASES[name] ?? name) : null;
    }
    if (type === "mluc" && u32be(icc, offset + 8) > 0) {
      const length = u32be(icc, offset + 20);
      const start = offset + u32be(icc, offset + 24);
      if (start + length > icc.length) return null;
      const name = cleanText(
        new TextDecoder("utf-16be").decode(icc.subarray(start, start + length)),
      );
      return name ? (ICC_ALIASES[name] ?? name) : null;
    }
    return null;
  }
  return null;
}

// ── PNG ──────────────────────────────────────────────────────────────────────

const PNG_COLOR_TYPES: Record<number, { mode: string; channels: number; alpha: boolean }> = {
  0: { mode: "Grayscale", channels: 1, alpha: false },
  2: { mode: "RGB", channels: 3, alpha: false },
  3: { mode: "Indexed", channels: 1, alpha: false },
  4: { mode: "Grayscale + alpha", channels: 2, alpha: true },
  6: { mode: "RGBA", channels: 4, alpha: true },
};

async function inspectPng(b: Uint8Array): Promise<ImageSpecs> {
  const specs = emptySpecs("PNG");
  let colorType = -1;
  let hasTransparencyChunk = false;
  let offset = 8;

  while (offset + 8 <= b.length) {
    const length = u32be(b, offset);
    const type = ascii(b, offset + 4, 4);
    const data = offset + 8;
    if (type === "IDAT" || type === "IEND") break;
    if (data + length > b.length) break;

    if (type === "IHDR") {
      specs.width = u32be(b, data);
      specs.height = u32be(b, data + 4);
      specs.bitDepth = b[data + 8];
      colorType = b[data + 9];
      if (b[data + 12] === 1) specs.encoding.push("Adam7 interlaced");
    } else if (type === "sRGB") {
      specs.colorProfile ??= "sRGB";
    } else if (type === "iCCP") {
      let nameEnd = data;
      while (nameEnd < data + length && b[nameEnd] !== 0) nameEnd++;
      const keyword = cleanText(ascii(b, data, nameEnd - data));
      // keyword, NUL, compression method, then a zlib stream
      const icc = await inflateZlib(b.subarray(nameEnd + 2, data + length));
      specs.colorProfile = (icc && iccProfileDescription(icc)) ?? keyword ?? "ICC";
    } else if (type === "tRNS") {
      hasTransparencyChunk = true;
    } else if (type === "acTL") {
      specs.animated = true;
      specs.encoding.push("APNG");
    }
    offset = data + length + 4;
  }

  const color = PNG_COLOR_TYPES[colorType];
  if (color && specs.bitDepth !== null) {
    specs.hasAlpha = color.alpha || hasTransparencyChunk;
    specs.colorMode =
      hasTransparencyChunk && !color.alpha ? `${color.mode} + transparency` : color.mode;
    specs.bitsPerPixel = colorType === 3 ? specs.bitDepth : specs.bitDepth * color.channels;
  }
  return specs;
}

// ── JPEG ─────────────────────────────────────────────────────────────────────

function isStartOfFrame(marker: number) {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

const SUBSAMPLING: Record<string, string> = {
  "1x1": "4:4:4",
  "2x1": "4:2:2",
  "2x2": "4:2:0",
  "4x1": "4:1:1",
  "1x2": "4:4:0",
};

function inspectJpeg(b: Uint8Array): ImageSpecs {
  const specs = emptySpecs("JPEG");
  const iccChunks: Uint8Array[] = [];
  let adobeTransform: number | null = null;
  let components = 0;
  let sampling: Array<{ h: number; v: number }> = [];
  let offset = 2;

  while (offset + 4 <= b.length) {
    if (b[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = b[offset + 1];
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break; // image data starts / ends
    const end = offset + 2 + u16be(b, offset + 2);
    const data = offset + 4;
    if (end > b.length) break;

    if (marker === 0xe2 && ascii(b, data, 12) === "ICC_PROFILE\u0000") {
      iccChunks.push(b.subarray(data + 14, end));
    } else if (marker === 0xee && ascii(b, data, 5) === "Adobe") {
      adobeTransform = b[data + 11];
    } else if (isStartOfFrame(marker)) {
      specs.bitDepth = b[data];
      specs.height = u16be(b, data + 1);
      specs.width = u16be(b, data + 3);
      components = b[data + 5];
      sampling = Array.from({ length: components }, (_, i) => {
        const factors = b[data + 6 + i * 3 + 1];
        return { h: factors >> 4, v: factors & 0x0f };
      });
      if ([0xc2, 0xc6, 0xca, 0xce].includes(marker)) specs.encoding.push("Progressive");
      else if (marker === 0xc3) specs.encoding.push("Lossless");
      else specs.encoding.push("Baseline");
    }
    offset = end;
  }

  if (components > 0 && specs.bitDepth !== null) {
    specs.bitsPerPixel = specs.bitDepth * components;
    specs.hasAlpha = false;
    specs.colorMode =
      components === 1
        ? "Grayscale"
        : components === 3
          ? "RGB"
          : components === 4
            ? adobeTransform === 2
              ? "CMYK (YCCK)"
              : "CMYK"
            : `${components} channels`;
    // Three components without an Adobe "no transform" flag are stored as YCbCr.
    if (components === 3 && adobeTransform !== 0 && sampling.length === 3) {
      const [luma, chroma] = sampling;
      const key = `${luma.h / Math.max(1, chroma.h)}x${luma.v / Math.max(1, chroma.v)}`;
      specs.encoding.push(`YCbCr ${SUBSAMPLING[key] ?? key}`);
    }
  }

  if (iccChunks.length > 0) {
    const total = iccChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const icc = new Uint8Array(total);
    let at = 0;
    for (const chunk of iccChunks) {
      icc.set(chunk, at);
      at += chunk.length;
    }
    specs.colorProfile = iccProfileDescription(icc) ?? "ICC";
  }
  return specs;
}

// ── WebP ─────────────────────────────────────────────────────────────────────

function inspectWebp(b: Uint8Array): ImageSpecs {
  const specs = emptySpecs("WebP");
  specs.bitDepth = 8;
  let offset = 12;

  while (offset + 8 <= b.length) {
    const type = ascii(b, offset, 4);
    const size = u32le(b, offset + 4);
    const data = offset + 8;

    if (type === "VP8X") {
      const flags = b[data];
      specs.hasAlpha = (flags & 0x10) !== 0;
      specs.animated = (flags & 0x02) !== 0;
      specs.width = u24le(b, data + 4) + 1;
      specs.height = u24le(b, data + 7) + 1;
    } else if (type === "ICCP" && data + size <= b.length) {
      specs.colorProfile = iccProfileDescription(b.subarray(data, data + size)) ?? "ICC";
    } else if (type === "ALPH") {
      specs.hasAlpha = true;
    } else if (type === "VP8L") {
      specs.encoding.push("Lossless");
      const bits = u32le(b, data + 1);
      specs.width ??= (bits & 0x3fff) + 1;
      specs.height ??= ((bits >> 14) & 0x3fff) + 1;
      specs.hasAlpha ||= ((bits >> 28) & 1) === 1;
      break;
    } else if (type === "VP8 ") {
      specs.encoding.push("Lossy");
      specs.width ??= u16le(b, data + 6) & 0x3fff;
      specs.height ??= u16le(b, data + 8) & 0x3fff;
      break;
    } else if (type === "ANMF") {
      specs.encoding.push("Animated");
      break;
    }
    offset = data + size + (size & 1);
  }

  specs.hasAlpha ??= false;
  specs.colorMode = specs.hasAlpha ? "RGBA" : "RGB";
  specs.bitsPerPixel = specs.hasAlpha ? 32 : 24;
  return specs;
}

// ── GIF / AVIF (identification only) ────────────────────────────────────────

function inspectGif(b: Uint8Array): ImageSpecs {
  const specs = emptySpecs("GIF");
  specs.width = u16le(b, 6);
  specs.height = u16le(b, 8);
  // Palette size is only known up front when a global colour table is present.
  const hasGlobalPalette = (b[10] & 0x80) !== 0;
  specs.bitDepth = hasGlobalPalette ? (b[10] & 0x07) + 1 : null;
  specs.bitsPerPixel = specs.bitDepth;
  specs.colorMode = "Indexed";
  return specs;
}

/** Identify the format from magic bytes and read whatever the header exposes. */
export async function inspectImageBytes(bytes: Uint8Array): Promise<ImageSpecs> {
  const b = bytes;
  if (b.length >= 24 && u32be(b, 0) === 0x89504e47 && u32be(b, 4) === 0x0d0a1a0a) {
    return inspectPng(b);
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return inspectJpeg(b);
  }
  if (b.length >= 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
    return inspectWebp(b);
  }
  if (b.length >= 13 && ascii(b, 0, 4) === "GIF8") {
    return inspectGif(b);
  }
  if (b.length >= 12 && ascii(b, 4, 4) === "ftyp" && /^avi[fs]$/.test(ascii(b, 8, 4))) {
    return emptySpecs("AVIF");
  }
  return emptySpecs("unknown");
}
