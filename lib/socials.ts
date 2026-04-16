const SITE_ORIGIN = "https://dekoder.fm";

export const SITE_CONTACT_EMAIL = "hello@dekoder.fm";

export const SITE_CONTACT_MAILTO = `mailto:${SITE_CONTACT_EMAIL}`;

export const PODCAST_SOCIAL_KEYS = ["socialTwitter", "socialInstagram", "socialLinkedin"] as const;
export type PodcastSocialKey = (typeof PODCAST_SOCIAL_KEYS)[number];

export const PODCAST_SOCIAL_HREF: Record<PodcastSocialKey, string> = {
  socialTwitter: `${SITE_ORIGIN}/`,
  socialInstagram: `${SITE_ORIGIN}/`,
  socialLinkedin: `${SITE_ORIGIN}/`,
};

export const HOST_SOCIAL_X_HREF = {
  jan: "https://x.com/iantomasik",
  martin: "https://x.com/martindeveloper",
} as const;
