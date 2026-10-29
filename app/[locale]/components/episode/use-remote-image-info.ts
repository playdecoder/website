"use client";

import { useEffect, useState } from "react";

import { type ImageSpecs, inspectImageBytes } from "@/lib/image/inspect-image";

export interface RemoteImageInfo {
  /** Full file size from the HEAD response. */
  bytes: number | null;
  contentType: string | null;
  /** Epoch ms of the CDN's Last-Modified header, i.e. when the file was last uploaded. */
  lastModified: number | null;
  /** Epoch ms when the info was fetched, so "x hours ago" stays pure during render. */
  fetchedAt: number;
  specs: ImageSpecs;
}

export type RemoteImageInfoState =
  | { status: "loading" }
  | { status: "ready"; info: RemoteImageInfo }
  | { status: "error" };

/** Headers sit at the start; 128 KB covers PNG chunks before IDAT and JPEG ICC segments. */
const PROBE_BYTES = 128 * 1024;

const cache = new Map<string, Promise<RemoteImageInfo>>();

async function loadRemoteImageInfo(src: string): Promise<RemoteImageInfo> {
  // no-store: after a re-upload the panel must show the new file, not a cached answer.
  const [head, probe] = await Promise.all([
    fetch(src, { method: "HEAD", mode: "cors", cache: "no-store" }),
    fetch(src, {
      mode: "cors",
      cache: "no-store",
      headers: { Range: `bytes=0-${PROBE_BYTES - 1}` },
    }),
  ]);
  if (!probe.ok) throw new Error(`HTTP ${probe.status}`);

  const buffer = new Uint8Array(await probe.arrayBuffer());
  const headLength = head.ok ? Number(head.headers.get("content-length")) : Number.NaN;
  const lastModified = Date.parse(
    head.headers.get("last-modified") ?? probe.headers.get("last-modified") ?? "",
  );

  return {
    bytes:
      Number.isFinite(headLength) && headLength > 0
        ? headLength
        : probe.status === 200
          ? buffer.length
          : null,
    contentType: head.headers.get("content-type") ?? probe.headers.get("content-type"),
    lastModified: Number.isNaN(lastModified) ? null : lastModified,
    fetchedAt: Date.now(),
    specs: await inspectImageBytes(buffer.subarray(0, PROBE_BYTES)),
  };
}

function getRemoteImageInfo(src: string) {
  let pending = cache.get(src);
  if (!pending) {
    pending = loadRemoteImageInfo(src);
    cache.set(src, pending);
    // Let a later open retry, e.g. after a CORS or network hiccup.
    pending.catch(() => cache.delete(src));
  }
  return pending;
}

/**
 * Live file details for a CDN image, read in the browser so re-uploads show up without a
 * redeploy. Needs the CDN to allow this origin via CORS; otherwise resolves to `error`.
 */
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
