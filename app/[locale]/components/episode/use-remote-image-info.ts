"use client";

import { useEffect, useState } from "react";

import { type ImageInfoPayload, readImageInfo } from "@/lib/image/read-image-info";
import { PODCAST_CDN_ORIGIN } from "@/lib/site/urls";

export interface RemoteImageInfo extends ImageInfoPayload {
  /** Epoch ms when the info was fetched, so "x hours ago" stays pure during render. */
  fetchedAt: number;
}

export type RemoteImageInfoState =
  | { status: "loading" }
  | { status: "ready"; info: RemoteImageInfo }
  | { status: "error" };

const IMAGE_INFO_ENDPOINT = "/api/review/image-info";

const cache = new Map<string, Promise<RemoteImageInfo>>();

async function loadRemoteImageInfo(src: string): Promise<RemoteImageInfo> {
  let payload: ImageInfoPayload;
  if (src.startsWith(`${PODCAST_CDN_ORIGIN}/`)) {
    // Cross-origin: read on the server so CDN CORS rules don't matter.
    const response = await fetch(`${IMAGE_INFO_ENDPOINT}?src=${encodeURIComponent(src)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = (await response.json()) as ImageInfoPayload;
  } else {
    // Site files (key art) are same-origin and can be read directly.
    payload = await readImageInfo(src);
  }
  return { ...payload, fetchedAt: Date.now() };
}

function getRemoteImageInfo(src: string) {
  let pending = cache.get(src);
  if (!pending) {
    pending = loadRemoteImageInfo(src);
    cache.set(src, pending);
    // Let a later open retry after a network hiccup.
    pending.catch(() => cache.delete(src));
  }
  return pending;
}

/**
 * Forget cached file details. The lightbox calls this on close so the next open re-reads
 * the files and shows a re-upload without a page reload.
 */
export function clearRemoteImageInfoCache() {
  cache.clear();
}

/** Live file details for a review image, read on demand so re-uploads show without a redeploy. */
export function useRemoteImageInfo(src: string): RemoteImageInfoState {
  const [result, setResult] = useState<{ src: string; state: RemoteImageInfoState } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRemoteImageInfo(src).then(
      (info) => {
        if (!cancelled) setResult({ src, state: { status: "ready", info } });
      },
      () => {
        if (!cancelled) setResult({ src, state: { status: "error" } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [src]);

  return result?.src === src ? result.state : { status: "loading" };
}
