export const HERO_WAVEFORM_SLOWDOWN = 1.85;

export function scaleHeroWaveTime(value: string): string {
  const m = value.trim().match(/^([\d.]+)s$/);
  if (!m) return value;
  const scaled = Math.round(parseFloat(m[1]) * HERO_WAVEFORM_SLOWDOWN * 100) / 100;
  return `${scaled}s`;
}
