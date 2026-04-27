import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteUrl();
  return {
    rules: [
      { userAgent: "facebookexternalhit", allow: "/" },
      { userAgent: "Facebot", allow: "/" },
      { userAgent: "Twitterbot", allow: "/" },
      { userAgent: "LinkedInBot", allow: "/" },
      { userAgent: "Pinterestbot", allow: "/" },
      { userAgent: "Slackbot", allow: "/" },
      { userAgent: "TelegramBot", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      { userAgent: "*", allow: "/" },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
