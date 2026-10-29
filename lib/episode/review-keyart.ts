import { open } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

import { inspectImageBytes } from "@/lib/image/inspect-image";

const PROBE_BYTES = 128 * 1024;

/**
 * Pixel size of an image under `public/`, read from its header at build time.
 * Returns null for remote URLs, paths outside `public/`, missing files or unknown formats.
 */
export async function readPublicImageSize(
  publicPath: string | undefined,
): Promise<{ width: number; height: number } | null> {
  if (!publicPath?.startsWith("/") || publicPath.startsWith("//")) return null;

  const publicDir = join(process.cwd(), "public");
  const filePath = normalize(join(publicDir, decodeURIComponent(publicPath.split("?")[0])));
  if (!filePath.startsWith(publicDir + sep)) return null;

  let handle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    handle = await open(filePath, "r");
    const buffer = new Uint8Array(PROBE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, PROBE_BYTES, 0);
    const specs = await inspectImageBytes(buffer.subarray(0, bytesRead));
    return specs.width && specs.height ? { width: specs.width, height: specs.height } : null;
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}
