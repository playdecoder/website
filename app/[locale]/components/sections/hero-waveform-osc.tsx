"use client";

import { useEffect, useRef, useState } from "react";

type ChannelVisual = {
  rgb: readonly [number, number, number];
  glowRgb: readonly [number, number, number];
  lineWidth: number;
  glowWidth: number;
  glowAlpha: number;
  alpha: number;
};

type NoisePhase = readonly [number, number, number, number, number, number, number];

type Channel = ChannelVisual & {
  noiseAmp: number;
  noisePhase: NoisePhase;
};

type GradCache = { main: CanvasGradient; glow: CanvasGradient };

type PartialBucket = { main: CanvasGradient; glow: CanvasGradient };

type FragmentCell = {
  x: number;
  y: number;
  char: string;
  speed: number;
  phase: number;
  maxAlpha: number;
};

type RenderState = {
  graticule: OffscreenCanvas;
  nlCache: Float32Array;
  yBuf: Float32Array;
  ySmooth: Float32Array;
  gradCache: GradCache[];
  partialByCh: PartialBucket[][];
  partialBucketPx: number;
  partialBucketCount: number;
  channels: Channel[];
  bg: string;
  glowBlend: GlobalCompositeOperation;
  w: number;
  h: number;
  cy: number;
  amp: number;
  dark: boolean;
  fragments: FragmentCell[];
  fragmentFont: string;
  decodeScanX0: number;
  decodeScanX1: number;
};

const DECODE_START = 0.32;
const DECODE_END = 0.62;
const INV_DECODE_RANGE = 1 / (DECODE_END - DECODE_START);

const CANVAS_HEIGHT = 200;
const SCROLL_PX_PER_SEC = 96;
const INV_SCROLL = 1 / SCROLL_PX_PER_SEC;

const AMPLITUDE = 0.72;
const GRID_COLS = 10;
const GRID_ROWS = 8;

const PARTIAL_GRAD_BUCKET_PX = 8;

const W0 = 0.06;
const W1 = 0.24;
const W2 = 0.4;
const W3 = 0.24;
const W4 = 0.06;

function fillNlCache(out: Float32Array, w: number): void {
  const invW = 1 / w;
  for (let px = 0; px <= w + 1; px++) {
    // reversed: left side = full noise, right side = clean
    const s = 1 - (px * invW - DECODE_START) * INV_DECODE_RANGE;
    if (s <= 0) out[px] = 0;
    else if (s >= 1) out[px] = 1;
    else out[px] = s * s * s * (s * (s * 6 - 15) + 10);
  }
}

function pNoise(t: number, p: NoisePhase): number {
  return (
    Math.sin(t * 43.7 + p[0]) * 0.26 +
    Math.sin(t * 78.3 + p[1]) * 0.21 +
    Math.sin(t * 123.1 + p[2]) * 0.16 +
    Math.sin(t * 187.4 + p[3]) * 0.12 +
    Math.sin(t * 264.9 + p[4]) * 0.08 +
    Math.sin(t * 341.2 + p[5]) * 0.05 +
    Math.sin(t * 433.7 + p[6]) * 0.03
  );
}

function signalSample(chIdx: number, t: number): number {
  switch (chIdx) {
    case 0: {
      const env = 0.52 + 0.48 * Math.sin(t * 0.17 + 0.8);
      return (0.32 * Math.sin(t * 0.52) + 0.18 * Math.sin(t * 1.09 + 1.2)) * env;
    }
    case 1: {
      const beat = 0.38 * Math.sin(t * 2.0) + 0.38 * Math.sin(t * 3.26);
      const hf = 0.14 * Math.sin(t * 7.14 + 0.6) + 0.06 * Math.sin(t * 13.8 - 0.4);
      return beat + hf;
    }
    case 2: {
      const base = 0.4 * Math.sin(t * 1.618);
      const fm = 0.28 * Math.sin(t * 4.236 - 0.8 + 0.38 * Math.sin(t * 0.29));
      const hf = 0.14 * Math.sin(t * 9.13 + 0.5);
      const gate = 0.5 + 0.5 * Math.sin(t * 7.3);
      const bump = Math.max(0, (gate - 0.82) / 0.18);
      const spike = bump * bump * (3 - 2 * bump) * 0.38 * Math.sin(t * 24.7);
      return base + fm + hf + spike;
    }
    default:
      return 0;
  }
}

const NOISE_SEED = [1.0, 2.718, 3.14159] as const;
const NOISE_COEF = [1.618, 2.414, 0.732, 1.234, 3.141, 0.577, 2.718] as const;

function noisePhaseForSeed(seed: number): NoisePhase {
  return [
    seed * NOISE_COEF[0],
    seed * NOISE_COEF[1],
    seed * NOISE_COEF[2],
    seed * NOISE_COEF[3],
    seed * NOISE_COEF[4],
    seed * NOISE_COEF[5],
    seed * NOISE_COEF[6],
  ];
}

const DARK_VISUALS: ChannelVisual[] = [
  {
    rgb: [165, 188, 218],
    glowRgb: [155, 180, 210],
    lineWidth: 1.15,
    glowWidth: 7,
    glowAlpha: 0.48,
    alpha: 0.62,
  },
  {
    rgb: [40, 72, 255],
    glowRgb: [80, 140, 255],
    lineWidth: 1.65,
    glowWidth: 15,
    glowAlpha: 0.62,
    alpha: 0.98,
  },
  {
    rgb: [235, 255, 40],
    glowRgb: [240, 255, 60],
    lineWidth: 1.65,
    glowWidth: 19,
    glowAlpha: 0.66,
    alpha: 0.99,
  },
];

const LIGHT_VISUALS: ChannelVisual[] = [
  {
    rgb: [72, 92, 132],
    glowRgb: [90, 108, 140],
    lineWidth: 1.15,
    glowWidth: 7,
    glowAlpha: 0.14,
    alpha: 0.72,
  },
  {
    rgb: [12, 36, 188],
    glowRgb: [30, 58, 255],
    lineWidth: 1.65,
    glowWidth: 13,
    glowAlpha: 0.15,
    alpha: 0.96,
  },
  {
    rgb: [72, 82, 0],
    glowRgb: [112, 126, 0],
    lineWidth: 1.65,
    glowWidth: 16,
    glowAlpha: 0.12,
    alpha: 0.92,
  },
];

const NOISE_AMP = [2.2, 1.4, 1.0] as const;

function buildChannels(dark: boolean): Channel[] {
  const visuals = dark ? DARK_VISUALS : LIGHT_VISUALS;
  return [0, 1, 2].map((i) => ({
    ...visuals[i]!,
    noiseAmp: NOISE_AMP[i]!,
    noisePhase: noisePhaseForSeed(NOISE_SEED[i]!),
  }));
}

function buildGraticule(w: number, h: number, dark: boolean): OffscreenCanvas {
  const oc = new OffscreenCanvas(w, h);
  const ctx = oc.getContext("2d");
  if (!ctx) return oc;

  const gridA = dark ? 0.07 : 0.09;
  const crossA = dark ? 0.16 : 0.16;
  const tickA = dark ? 0.24 : 0.22;
  const refA = dark ? 0.07 : 0.08;
  const refR = dark ? "225,255,0" : "96,108,0";
  const decodeA = dark ? 0.045 : 0.035;
  const lineA = dark ? 0.14 : 0.13;

  ctx.strokeStyle = `rgba(30,58,255,${gridA})`;
  ctx.lineWidth = 1;
  for (let c = 1; c < GRID_COLS; c++) {
    const x = (c / GRID_COLS) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let r = 1; r < GRID_ROWS; r++) {
    const y = (r / GRID_ROWS) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(30,58,255,${crossA})`;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(30,58,255,${tickA})`;
  const hTicks = GRID_COLS * 5;
  for (let i = 0; i <= hTicks; i++) {
    const x = (i / hTicks) * w;
    const l = i % 5 === 0 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(x, h / 2 - l / 2);
    ctx.lineTo(x, h / 2 + l / 2);
    ctx.stroke();
  }
  const vTicks = GRID_ROWS * 5;
  for (let i = 0; i <= vTicks; i++) {
    const y = (i / vTicks) * h;
    const l = i % 5 === 0 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(w / 2 - l / 2, y);
    ctx.lineTo(w / 2 + l / 2, y);
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(${refR},${refA})`;
  ctx.setLineDash([3, 7]);
  const ry1 = h / 2 - (h / 2) * AMPLITUDE * 0.9;
  const ry2 = h / 2 + (h / 2) * AMPLITUDE * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, ry1);
  ctx.lineTo(w, ry1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, ry2);
  ctx.lineTo(w, ry2);
  ctx.stroke();
  ctx.setLineDash([]);

  const dS = w * DECODE_START;
  const dE = w * DECODE_END;
  const dg = ctx.createLinearGradient(dS, 0, dE, 0);
  dg.addColorStop(0, `rgba(30,58,255,0)`);
  dg.addColorStop(0.5, `rgba(30,58,255,${decodeA})`);
  dg.addColorStop(1, `rgba(30,58,255,0)`);
  ctx.fillStyle = dg;
  ctx.fillRect(dS, 0, dE - dS, h);

  // dashed line at right boundary of decode zone — where clean signal emerges
  ctx.strokeStyle = `rgba(30,58,255,${lineA})`;
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.moveTo(dE, 0);
  ctx.lineTo(dE, h);
  ctx.stroke();
  ctx.setLineDash([]);

  return oc;
}

function addMainGlowStops(main: CanvasGradient, glow: CanvasGradient, ch: Channel): void {
  const [r, g, b] = ch.rgb;
  const [gr, gg, gb] = ch.glowRgb;
  // garbage on left (subdued), decoded/clean on right (bright)
  main.addColorStop(0.0, `rgba(${r},${g},${b},${ch.alpha * 0.32})`);
  main.addColorStop(0.28, `rgba(${r},${g},${b},${ch.alpha * 0.4})`);
  main.addColorStop(0.58, `rgba(${r},${g},${b},${ch.alpha * 0.78})`);
  main.addColorStop(1.0, `rgba(${r},${g},${b},${ch.alpha * 0.88})`);
  glow.addColorStop(0.0, `rgba(${gr},${gg},${gb},${ch.glowAlpha * 0.1})`);
  glow.addColorStop(0.45, `rgba(${gr},${gg},${gb},${ch.glowAlpha * 0.22})`);
  glow.addColorStop(1.0, `rgba(${gr},${gg},${gb},${ch.glowAlpha * 0.4})`);
}

function addPartialStops(main: CanvasGradient, glow: CanvasGradient, ch: Channel): void {
  const [r, g, b] = ch.rgb;
  const [gr, gg, gb] = ch.glowRgb;
  // gradient from x=0 (dim garbage) to x=endX (bright decoded)
  main.addColorStop(0, `rgba(${r},${g},${b},${ch.alpha * 0.32})`);
  main.addColorStop(0.5, `rgba(${r},${g},${b},${ch.alpha * 0.6})`);
  main.addColorStop(1, `rgba(${r},${g},${b},${ch.alpha * 0.88})`);
  glow.addColorStop(0, `rgba(${gr},${gg},${gb},${ch.glowAlpha * 0.08})`);
  glow.addColorStop(0.5, `rgba(${gr},${gg},${gb},${ch.glowAlpha * 0.22})`);
  glow.addColorStop(1, `rgba(${gr},${gg},${gb},${ch.glowAlpha * 0.4})`);
}

function buildPartialGradientTable(
  ctx: CanvasRenderingContext2D,
  w: number,
  channels: Channel[],
  bucketPx: number,
): PartialBucket[][] {
  const n = Math.ceil(w / bucketPx) + 1;
  const out: PartialBucket[][] = [[], [], []];
  for (let ci = 0; ci < 3; ci++) {
    const ch = channels[ci]!;
    const row = out[ci]!;
    for (let b = 0; b < n; b++) {
      // reversed: head at x=0, tail at endX — gradient runs left to right
      const ex = Math.min(b * bucketPx, w);
      const main = ctx.createLinearGradient(0, 0, ex, 0);
      const glow = ctx.createLinearGradient(0, 0, ex, 0);
      addPartialStops(main, glow, ch);
      row.push({ main, glow });
    }
  }
  return out;
}

function smoothTraceYCore(dst: Float32Array, src: Float32Array, from: number, to: number): void {
  for (let px = from; px <= to; px++) {
    dst[px] =
      W0 * src[px - 2]! + W1 * src[px - 1]! + W2 * src[px]! + W3 * src[px + 1]! + W4 * src[px + 2]!;
  }
}

function smoothTraceY(dst: Float32Array, src: Float32Array, startX: number, w: number): void {
  const lo = startX;
  const hi = w;
  let px = lo;

  for (; px <= hi && px <= lo + 1; px++) {
    const i0 = px - 2 < lo ? lo : px - 2;
    const i1 = px - 1 < lo ? lo : px - 1;
    const i3 = px + 1 > hi ? hi : px + 1;
    const i4 = px + 2 > hi ? hi : px + 2;
    dst[px] = W0 * src[i0]! + W1 * src[i1]! + W2 * src[px]! + W3 * src[i3]! + W4 * src[i4]!;
  }

  const coreEnd = hi - 2;
  if (px <= coreEnd) {
    smoothTraceYCore(dst, src, px, coreEnd);
    px = coreEnd + 1;
  }

  for (; px <= hi; px++) {
    const i0 = px - 2 < lo ? lo : px - 2;
    const i1 = px - 1 < lo ? lo : px - 1;
    const i3 = px + 1 > hi ? hi : px + 1;
    const i4 = px + 2 > hi ? hi : px + 2;
    dst[px] = W0 * src[i0]! + W1 * src[i1]! + W2 * src[px]! + W3 * src[i3]! + W4 * src[i4]!;
  }
}

const FRAGMENT_CHARS = ["•", "—", "•", "—", "•", "·"] as const;

const DECODE_TARGET = "DEKODÉR";
const DECODE_SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#▓▚¤§∆◊•—";
const DECODE_RESOLVE_PER_CHAR = 0.42;
const DECODE_HOLD = 2.6;
const DECODE_CYCLE = DECODE_TARGET.length * DECODE_RESOLVE_PER_CHAR + DECODE_HOLD;

function decodeReadout(elapsed: number): string {
  const cycle = elapsed % DECODE_CYCLE;
  let out = "";
  for (let i = 0; i < DECODE_TARGET.length; i++) {
    const lockAt = (i + 1) * DECODE_RESOLVE_PER_CHAR;
    if (cycle >= lockAt) {
      out += DECODE_TARGET[i];
      continue;
    }
    const tick = Math.floor(elapsed * 22 + i * 11);
    out += DECODE_SCRAMBLE[tick % DECODE_SCRAMBLE.length];
  }
  return out;
}

function buildFragments(w: number, h: number): FragmentCell[] {
  const zoneW = w * DECODE_START;
  const cols = 8;
  const rows = 6;
  const cellW = zoneW / cols;
  const cellH = h / rows;
  const out: FragmentCell[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const seed = col * 31 + row * 17;
      if (seed % 3 === 0) continue; // natural sparsity
      const xNorm = (col + 0.5) / cols;
      const edgeFade = 1 - Math.max(0, (xNorm - 0.6) / 0.4);
      out.push({
        x: (col + 0.5) * cellW,
        y: (row + 0.5) * cellH,
        char: FRAGMENT_CHARS[seed % FRAGMENT_CHARS.length]!,
        speed: 0.38 + (seed % 13) * 0.07,
        phase: seed * 0.618,
        maxAlpha: 0.28 * edgeFade,
      });
    }
  }
  return out;
}

function drawFragments(
  ctx: CanvasRenderingContext2D,
  fragments: FragmentCell[],
  elapsed: number,
  dark: boolean,
  font: string,
): void {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const color = dark ? "40,72,255" : "20,45,190";
  for (const f of fragments) {
    const a = f.maxAlpha * (0.2 + 0.8 * (0.5 + 0.5 * Math.sin(elapsed * f.speed + f.phase)));
    if (a < 0.012) continue;
    ctx.fillStyle = `rgba(${color},${a.toFixed(3)})`;
    ctx.fillText(f.char, f.x, f.y);
  }
}

function drawDecodeScan(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  h: number,
  elapsed: number,
  dark: boolean,
): void {
  // beam oscillates within the decode zone
  const t = elapsed * 0.72;
  const x = x0 + (x1 - x0) * (0.5 + 0.5 * Math.sin(t));
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 3.8 + 1.1);
  const a = ((dark ? 0.55 : 0.4) * (0.45 + 0.55 * pulse)).toFixed(3);
  ctx.fillStyle = dark ? `rgba(235,255,40,${a})` : `rgba(60,75,0,${a})`;
  ctx.fillRect(x - 0.75, 0, 1.5, h);
}

function buildRenderState(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dark: boolean,
): RenderState {
  const channels = buildChannels(dark);

  const nlCache = new Float32Array(w + 2);
  fillNlCache(nlCache, w);

  const yBuf = new Float32Array(w + 2);
  const ySmooth = new Float32Array(w + 2);

  const gradCache: GradCache[] = channels.map((ch) => {
    const main = ctx.createLinearGradient(0, 0, w, 0);
    const glow = ctx.createLinearGradient(0, 0, w, 0);
    addMainGlowStops(main, glow, ch);
    return { main, glow };
  });

  const partialByCh = buildPartialGradientTable(ctx, w, channels, PARTIAL_GRAD_BUCKET_PX);

  const bg = dark ? "#0b0f14" : "#f7f9fc";
  const glowBlend: GlobalCompositeOperation = dark ? "screen" : "source-over";
  const cy = h / 2;
  const amp = cy * AMPLITUDE;

  return {
    graticule: buildGraticule(w, h, dark),
    nlCache,
    yBuf,
    ySmooth,
    gradCache,
    partialByCh,
    partialBucketPx: PARTIAL_GRAD_BUCKET_PX,
    partialBucketCount: partialByCh[0]!.length,
    channels,
    bg,
    glowBlend,
    w,
    h,
    cy,
    amp,
    dark,
    fragments: buildFragments(w, h),
    fragmentFont: `${Math.round(Math.max(7, h / 14))}px "Courier New", monospace`,
    decodeScanX0: w * DECODE_START,
    decodeScanX1: w * DECODE_END,
  };
}

function drawChannel(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  elapsed: number,
  chIdx: number,
): void {
  const ch = state.channels[chIdx]!;
  const {
    nlCache,
    yBuf,
    ySmooth,
    gradCache,
    glowBlend,
    w,
    cy,
    amp,
    partialByCh,
    partialBucketPx,
    partialBucketCount,
  } = state;

  const visibleWidth = elapsed * SCROLL_PX_PER_SEC;
  if (visibleWidth < 2) return;

  const filled = visibleWidth >= w;
  // reversed: head at x=0, signal fills rightward
  const endX = filled ? w : visibleWidth | 0;

  const na = ch.noiseAmp;
  const phase = ch.noisePhase;

  // reversed time: px=0 = current (head), px increases = older data
  for (let px = 0; px <= endX; px++) {
    const nl = nlCache[px]!;
    const t = elapsed - px * INV_SCROLL;
    let y = signalSample(chIdx, t);
    if (nl > 0.008) y += pNoise(t, phase) * na * nl;
    yBuf[px] = cy - y * amp;
  }

  smoothTraceY(ySmooth, yBuf, 0, endX);

  const yNow = yBuf[0]!;
  const instAmp = Math.abs(yNow - cy) / amp;
  const clampedAmp = instAmp > 1 ? 1 : instAmp;

  let mainGrad: CanvasGradient;
  let glowGrad: CanvasGradient;
  if (filled) {
    mainGrad = gradCache[chIdx]!.main;
    glowGrad = gradCache[chIdx]!.glow;
  } else {
    const bi = (endX / partialBucketPx) | 0;
    const row = partialByCh[chIdx]!;
    const idx = bi < partialBucketCount ? bi : partialBucketCount - 1;
    const bucket = row[idx]!;
    mainGrad = bucket.main;
    glowGrad = bucket.glow;
  }

  ctx.beginPath();
  ctx.moveTo(0, ySmooth[0]!);
  for (let px = 1; px <= endX; px++) ctx.lineTo(px, ySmooth[px]!);

  ctx.save();
  ctx.globalCompositeOperation = glowBlend;
  ctx.globalAlpha = 0.17 + 0.22 * clampedAmp;
  ctx.lineWidth = ch.glowWidth;
  ctx.strokeStyle = glowGrad;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();

  ctx.lineWidth = ch.lineWidth;
  ctx.strokeStyle = mainGrad;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  if (visibleWidth > 8) {
    const [r, g, b] = ch.rgb;
    const [gr, gg, gb] = ch.glowRgb;
    // dot at head: x=0 (left edge)
    const dotX = 0;
    const haloR = ch.glowWidth * 0.4 * (0.58 + 0.2 * clampedAmp);

    ctx.save();
    ctx.globalCompositeOperation = glowBlend;
    ctx.beginPath();
    ctx.arc(dotX, yNow, haloR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${gr},${gg},${gb},${0.12 + 0.1 * clampedAmp})`;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(dotX, yNow, 1.9, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.58 + 0.12 * clampedAmp})`;
    ctx.fill();
  }
}

export function HeroWaveformOsc() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const readoutLastRef = useRef<string>("");
  const animRef = useRef<number | null>(null);
  const stateRef = useRef<RenderState | null>(null);
  const elapsedRef = useRef(0);

  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onVis = () => setTabVisible(document.visibilityState !== "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    const el = rootRef.current;
    if (el && typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
        root: null,
        rootMargin: "96px 0px 96px 0px",
        threshold: 0,
      });
      io.observe(el);
      return () => {
        document.removeEventListener("visibilitychange", onVis);
        io.disconnect();
      };
    }
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const check = () => setIsDark(root.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (isDark === null) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const H = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    const dpr = () => (typeof window !== "undefined" && window.devicePixelRatio) || 1;

    const render = (elapsed: number) => {
      const s = stateRef.current;
      if (!s) return;
      elapsedRef.current = elapsed;
      ctx.fillStyle = s.bg;
      ctx.fillRect(0, 0, s.w, s.h);
      ctx.drawImage(s.graticule, 0, 0);
      drawFragments(ctx, s.fragments, elapsed, s.dark, s.fragmentFont);
      drawDecodeScan(ctx, s.decodeScanX0, s.decodeScanX1, s.h, elapsed, s.dark);
      drawChannel(ctx, s, elapsed, 0);
      drawChannel(ctx, s, elapsed, 1);
      drawChannel(ctx, s, elapsed, 2);
      const el = readoutRef.current;
      if (el) {
        const next = decodeReadout(elapsed);
        if (next !== readoutLastRef.current) {
          el.textContent = next;
          readoutLastRef.current = next;
        }
      }
    };

    const syncSize = () => {
      const W = Math.max(container.clientWidth, 320);
      const r = dpr();
      canvas.width = W * r;
      canvas.height = H * r;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(r, 0, 0, r, 0, 0);
      stateRef.current = buildRenderState(ctx, W, H, isDark);
      // Canvas buffer clears when dimensions change; repaint immediately to avoid a black frame.
      render(elapsedRef.current);
    };

    syncSize();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            syncSize();
          })
        : null;
    ro?.observe(container);

    const onWinResize = () => {
      syncSize();
    };
    window.addEventListener("resize", onWinResize);

    if (reducedMotion) {
      const s = stateRef.current;
      if (s) render(s.w / SCROLL_PX_PER_SEC + 2);
      return () => {
        ro?.disconnect();
        window.removeEventListener("resize", onWinResize);
      };
    }

    if (!inView || !tabVisible) {
      return () => {
        ro?.disconnect();
        window.removeEventListener("resize", onWinResize);
      };
    }

    let startTs: number | null = null;
    const frame = (ts: number) => {
      animRef.current = requestAnimationFrame(frame);
      if (!inView || !tabVisible) return;
      if (startTs === null) startTs = ts;
      render((ts - startTs) * 0.001);
    };
    animRef.current = requestAnimationFrame(frame);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      ro?.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, [inView, tabVisible, isDark]);

  return (
    <div className="mb-12 w-full max-md:px-4 md:px-0" ref={rootRef}>
      <div className="hero-osc" ref={containerRef} aria-hidden>
        <div className="hero-osc__screen">
          <div className="hero-osc__scanlines" />
          <canvas ref={canvasRef} className="hero-osc__canvas" />
        </div>
        <div className="hero-osc__ui">
          <div className="hero-osc__labels">
            <span className="hero-osc__label hero-osc__label--a">CH1</span>
            <span className="hero-osc__label hero-osc__label--b">CH2</span>
            <span className="hero-osc__label hero-osc__label--c">CH3</span>
          </div>
          <div className="hero-osc__status" aria-label="DECODE">
            <span className="hero-osc__dot" />
            <span className="hero-osc__readout">
              <span className="hero-osc__readout-text" ref={readoutRef} aria-hidden>
                {DECODE_TARGET}
              </span>
              <span className="hero-osc__readout-cursor" aria-hidden />
            </span>
          </div>
        </div>
        <span className="hero-osc__corner hero-osc__corner--tl" />
        <span className="hero-osc__corner hero-osc__corner--tr" />
        <span className="hero-osc__corner hero-osc__corner--bl" />
        <span className="hero-osc__corner hero-osc__corner--br" />
      </div>
    </div>
  );
}
