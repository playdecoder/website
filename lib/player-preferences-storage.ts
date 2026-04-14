const STORAGE_KEY = "decoder:player-prefs:v1";

export interface PlayerPreferences {
  volume: number;
  muted: boolean;
  playbackRate: number;
}

interface StoreV1 {
  v: 1;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
}

const DEFAULTS: PlayerPreferences = {
  volume: 1,
  muted: false,
  playbackRate: 1,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) {
    return DEFAULTS.volume;
  }
  return Math.min(1, Math.max(0, n));
}

export function readPlayerPreferences(): PlayerPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULTS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw) as StoreV1;
    if (!parsed || parsed.v !== 1) {
      return { ...DEFAULTS };
    }
    return {
      volume: clamp01(typeof parsed.volume === "number" ? parsed.volume : DEFAULTS.volume),
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULTS.muted,
      playbackRate:
        typeof parsed.playbackRate === "number" && Number.isFinite(parsed.playbackRate)
          ? parsed.playbackRate
          : DEFAULTS.playbackRate,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writePlayerPreferences(prefs: PlayerPreferences): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        volume: clamp01(prefs.volume),
        muted: Boolean(prefs.muted),
        playbackRate: prefs.playbackRate,
      } satisfies StoreV1),
    );
  } catch {
    /* Quota / private mode */
  }
}
