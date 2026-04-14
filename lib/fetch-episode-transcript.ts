export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptPayload {
  segments?: TranscriptSegment[];
}

export type TranscriptFetchResult = { ok: true; segments: TranscriptSegment[] } | { ok: false };

export async function fetchEpisodeTranscript(url: string): Promise<TranscriptFetchResult> {
  const res = await fetch(url, { cache: "force-cache" }).catch(() => null);
  if (!res?.ok) {
    return { ok: false };
  }
  const raw: unknown = await res.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return { ok: false };
  }
  const payload = raw as TranscriptPayload;
  const segments = Array.isArray(payload.segments)
    ? payload.segments.filter((s): s is TranscriptSegment => {
        if (!s || typeof s !== "object") return false;
        const t = (s as { text?: unknown }).text;
        return typeof t === "string";
      })
    : [];
  return { ok: true, segments };
}
