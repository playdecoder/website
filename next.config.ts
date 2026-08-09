import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  poweredByHeader: false,
  allowedDevOrigins: ["localhost", "elixeum.local"],
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    qualities: [25, 75, 80, 85, 88, 90, 92, 95, 100],
  },
} satisfies NextConfig;

export default withBotId(withNextIntl(nextConfig));
