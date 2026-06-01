export const SITE_CONTACT_EMAIL = "studio@dekoder.fm";

export const SITE_CONTACT_MAILTO = `mailto:${SITE_CONTACT_EMAIL}`;

export const PODCAST_SOCIAL_KEYS = ["socialTwitter", "socialInstagram", "socialYoutube"] as const;
export type PodcastSocialKey = (typeof PODCAST_SOCIAL_KEYS)[number];

export const PODCAST_SOCIAL_HREF: Record<PodcastSocialKey, string> = {
  socialTwitter: "https://x.com/dekoderfm",
  socialInstagram: "https://www.instagram.com/dekoder.fm/",
  socialYoutube: "https://youtube.com/@dekoderfm",
};

export const HOST_SOCIAL_X_HREF = {
  jan: "https://x.com/iantomasik",
  martin: "https://x.com/martindeveloper",
} as const;
