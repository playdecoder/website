export const PODCAST_PLATFORM_KEYS = [
  "platformSpotify",
  "platformApple",
  "platformYoutube",
  "platformRss",
] as const;
export type PodcastPlatformKey = (typeof PODCAST_PLATFORM_KEYS)[number];

export const EPISODE_LISTEN_PLATFORM_KEYS = [
  "platformSpotify",
  "platformApple",
  "platformYoutube",
  "platformMp3",
] as const;
export type EpisodeListenPlatformKey = (typeof EPISODE_LISTEN_PLATFORM_KEYS)[number];
