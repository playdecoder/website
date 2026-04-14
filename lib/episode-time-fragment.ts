/**
 * W3C Media Fragments–style temporal hash for episode pages: `#t=123` (seconds).
 * @see https://www.w3.org/TR/media-frags/#naming-time
 */

export function formatEpisodeTimeHash(seconds: number): string {
  const s = Math.floor(Math.max(0, seconds));
  return `t=${s}`;
}

export function clampEpisodeFragmentSeconds(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 0;
  }
  if (Number.isFinite(duration) && duration > 0) {
    return Math.min(duration, seconds);
  }
  return seconds;
}

/** Parse `#t=…` / `t=…` from `location.hash` (or full hash string). Returns seconds or null. */
export function parseTimeFragmentFromHash(hash: string): number | null {
  const body = hash.replace(/^#/, "").trim();
  if (!body) {
    return null;
  }

  const npt = /^t\s*=\s*npt\s*:\s*([\d.]+)/i.exec(body);
  if (npt) {
    const v = Number(npt[1]);
    return Number.isFinite(v) ? v : null;
  }

  const plain = /^t\s*=\s*([\d.]+)/i.exec(body);
  if (plain) {
    const v = Number(plain[1]);
    return Number.isFinite(v) ? v : null;
  }

  return null;
}
