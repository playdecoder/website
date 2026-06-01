import { BRAND_NAME } from "@/lib/site/brand";
import type { Episode } from "@/lib/episode/catalog";
import { resolveEpisodeCoverImageUrl } from "@/lib/episode/cover";
import { showHostsAmpersand } from "@/lib/site/show";

function artworkMimeType(url: string): string {
  const base = url.split("?")[0]?.toLowerCase() ?? "";
  if (base.endsWith(".png")) return "image/png";
  if (base.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function buildEpisodeMediaMetadata(episode: Episode): MediaMetadata {
  const coverUrl = resolveEpisodeCoverImageUrl(episode);
  const type = artworkMimeType(coverUrl);

  return new MediaMetadata({
    title: `${episode.id} — ${episode.title}`,
    artist: showHostsAmpersand(),
    album: BRAND_NAME,
    artwork: [
      { src: coverUrl, sizes: "512x512", type },
      { src: coverUrl, sizes: "1024x1024", type },
    ],
  });
}

export function clearMediaSessionMetadata(): void {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = "none";
}

export interface PlayerMediaSessionHandlers {
  onPlay: () => void;
  onPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
}

export function bindPlayerMediaSessionHandlers(handlers: PlayerMediaSessionHandlers): () => void {
  if (!("mediaSession" in navigator)) return () => {};

  const ms = navigator.mediaSession;
  ms.setActionHandler("play", handlers.onPlay);
  ms.setActionHandler("pause", handlers.onPause);
  ms.setActionHandler("seekbackward", handlers.onSeekBackward);
  ms.setActionHandler("seekforward", handlers.onSeekForward);
  ms.setActionHandler("seekto", null);
  ms.setActionHandler("stop", null);
  ms.setActionHandler("previoustrack", null);
  ms.setActionHandler("nexttrack", null);

  return () => {
    ms.setActionHandler("play", null);
    ms.setActionHandler("pause", null);
    ms.setActionHandler("seekbackward", null);
    ms.setActionHandler("seekforward", null);
    ms.setActionHandler("seekto", null);
    ms.setActionHandler("stop", null);
    ms.setActionHandler("previoustrack", null);
    ms.setActionHandler("nexttrack", null);
  };
}

export function syncMediaSessionPlaybackState(isPlaying: boolean): void {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
}

export function syncMediaSessionPositionState(options: {
  duration: number;
  currentTime: number;
  playbackRate: number;
}): void {
  if (!("mediaSession" in navigator)) return;
  if (!Number.isFinite(options.duration) || options.duration <= 0) return;
  if (!Number.isFinite(options.currentTime) || options.currentTime < 0) return;
  if (!Number.isFinite(options.playbackRate) || options.playbackRate <= 0) return;

  const position = Math.min(options.currentTime, options.duration);
  try {
    navigator.mediaSession.setPositionState({
      duration: options.duration,
      playbackRate: options.playbackRate,
      position,
    });
  } catch {
    // Safari throws if position is briefly ahead of duration during seeks.
  }
}
