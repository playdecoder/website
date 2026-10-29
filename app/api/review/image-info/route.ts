import { type NextRequest, NextResponse } from "next/server";

import { readImageInfo } from "@/lib/image/read-image-info";
import { PODCAST_CDN_ORIGIN } from "@/lib/site/urls";

export const dynamic = "force-dynamic";

/** Accept only files under the podcast CDN, normalised to origin + path. */
function podcastCdnUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.origin !== PODCAST_CDN_ORIGIN || !url.pathname.startsWith("/podcast/")) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

/**
 * Tech specs for the review lightbox, read server-side so the panel works on any host
 * (preview deployments, other dev ports) without adding each origin to the CDN's CORS rules.
 */
export async function GET(request: NextRequest) {
  const src = podcastCdnUrl(request.nextUrl.searchParams.get("src"));
  if (!src) {
    return NextResponse.json({ error: "src must be a podcast CDN file" }, { status: 400 });
  }
  try {
    const info = await readImageInfo(src, { redirect: "error" });
    return NextResponse.json(info, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not read the file from the CDN" }, { status: 502 });
  }
}
