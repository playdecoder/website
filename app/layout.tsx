import "./globals.css";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Syne, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { showTaglineEn } from "@/lib/show";
import { getPublicSiteUrl } from "@/lib/site";

import { ThemeProvider } from "./[locale]/theme-provider";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: "Decoder — Games | Tech | Insight",
  description: showTaglineEn(),
  icons: {
    icon: [
      { url: "/icon.svg", media: "(prefers-color-scheme: light)", type: "image/svg+xml" },
      { url: "/icon-dark.svg", media: "(prefers-color-scheme: dark)", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Decoder — Games | Tech | Insight",
    description: showTaglineEn(),
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
  ],
};

export const dynamic = "force-static";
export const revalidate = false;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="cs"
      data-scroll-behavior="smooth"
      className={`${syne.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
