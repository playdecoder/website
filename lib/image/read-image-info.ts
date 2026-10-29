import { type ImageSpecs, inspectImageBytes } from "./inspect-image";

/** Headers sit at the start; 128 KB covers PNG chunks before IDAT and JPEG ICC segments. */
export const IMAGE_PROBE_BYTES = 128 * 1024;

export interface ImageInfoPayload {
  /** Full file size from the HEAD response. */
  bytes: number | null;
  contentType: string | null;
  /** Epoch ms of Last-Modified, i.e. when the file was last uploaded. */
  lastModified: number | null;
  specs: ImageSpecs;
}

/**
 * HEAD for size and upload time plus a ranged GET for the header bytes. Runs in the browser
 * for same-origin files and on the server (via the review API route) for CDN files.
 */
export async function readImageInfo(
  src: string,
  init: RequestInit = {},
): Promise<ImageInfoPayload> {
  // no-store: after a re-upload the answer must describe the new file.
  const base: RequestInit = { cache: "no-store", ...init };
  const [head, probe] = await Promise.all([
    fetch(src, { ...base, method: "HEAD" }),
    fetch(src, { ...base, headers: { Range: `bytes=0-${IMAGE_PROBE_BYTES - 1}` } }),
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
    specs: await inspectImageBytes(buffer.subarray(0, IMAGE_PROBE_BYTES)),
  };
}
