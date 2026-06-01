const HERO_WAVEFORM_SLOWDOWN = 1.85;

export function scaleHeroWaveTime(value: string): string {
  const m = value.trim().match(/^([\d.]+)s$/);
  if (!m) return value;
  const scaled = Math.round(parseFloat(m[1]) * HERO_WAVEFORM_SLOWDOWN * 100) / 100;
  return `${scaled}s`;
}

export function scaleListenWaveDuration(dur: string): string {
  const n = parseFloat(dur);
  if (!Number.isFinite(n)) {
    return "3.8s";
  }
  const scaled = n * 2.4;
  return `${Math.min(5.4, Math.max(2.9, scaled)).toFixed(2)}s`;
}
