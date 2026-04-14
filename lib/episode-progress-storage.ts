const STORAGE_KEY = "decoder:episode-playback:v1";
const MAX_EPISODES = 10;

export interface EpisodeProgressEntry {
  id: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

interface StoreV1 {
  v: 1;
  items: EpisodeProgressEntry[];
}

function parseStore(raw: string): EpisodeProgressEntry[] {
  try {
    const parsed = JSON.parse(raw) as StoreV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) {
      return [];
    }
    return parsed.items.filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.currentTime === "number" &&
        typeof e.duration === "number" &&
        typeof e.updatedAt === "number" &&
        Number.isFinite(e.currentTime) &&
        Number.isFinite(e.duration),
    );
  } catch {
    return [];
  }
}

export function readProgressStore(): EpisodeProgressEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return parseStore(raw);
  } catch {
    return [];
  }
}

function persist(items: EpisodeProgressEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items }));
  } catch {}
}

export function writeProgressSnapshot(id: string, currentTime: number, duration: number): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!id || !Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return;
  }
  const clamped = Math.max(0, Math.min(duration, currentTime));
  if (clamped >= duration - 3) {
    return;
  }
  if (clamped < 2) {
    return;
  }

  const next = readProgressStore().filter((e) => e.id !== id);
  next.push({
    id,
    currentTime: clamped,
    duration,
    updatedAt: Date.now(),
  });
  next.sort((a, b) => b.updatedAt - a.updatedAt);
  persist(next.slice(0, MAX_EPISODES));
}

export function getSavedPosition(id: string, reportedDuration: number): number | null {
  if (!id || !Number.isFinite(reportedDuration) || reportedDuration <= 0) {
    return null;
  }
  const entry = readProgressStore().find((e) => e.id === id);
  if (!entry) {
    return null;
  }
  if (Math.abs(entry.duration - reportedDuration) > 4) {
    return null;
  }
  if (entry.currentTime < 2) {
    return null;
  }
  if (entry.currentTime >= reportedDuration - 3) {
    return null;
  }
  return Math.min(entry.currentTime, reportedDuration - 0.5);
}

export function episodeHasStoredProgress(id: string): boolean {
  if (!id) {
    return false;
  }
  const entry = readProgressStore().find((e) => e.id === id);
  if (!entry) {
    return false;
  }
  if (
    !Number.isFinite(entry.currentTime) ||
    !Number.isFinite(entry.duration) ||
    entry.duration <= 0
  ) {
    return false;
  }
  if (entry.currentTime < 2) {
    return false;
  }
  if (entry.currentTime >= entry.duration - 3) {
    return false;
  }
  return true;
}

export function clearEpisodeProgress(id: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const next = readProgressStore().filter((e) => e.id !== id);
  persist(next);
}
