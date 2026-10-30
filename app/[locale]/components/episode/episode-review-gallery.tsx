"use client";

import Image from "next/image";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/ui/cn";

import { IconDownload } from "../ui/icons";

import { type LightboxItem, type LightboxLabels, ReviewLightbox } from "./episode-review-lightbox";

/** One frame, with every label already translated on the server. */
export interface ReviewGalleryItem {
  key: string;
  url: string;
  width: number;
  height: number;
  theme: "dark" | "light" | null;
  kind: "cover" | "social" | "web";
  layoutLabel: string;
  themeLabel: string | null;
  usedForLabels: string[];
  alt: string;
  goToLabel: string;
  /** File name offered by the download button (kit tone only). */
  downloadName?: string;
}

export interface ReviewGallerySection {
  key: string;
  heading: string;
  items: ReviewGalleryItem[];
  /** Shown instead of the grid when every frame in the section failed to load (kit tone only). */
  emptyNote?: string;
}

/** Shared share-kit labels; providing them switches the gallery to the kit tone. */
export interface ShareKitGalleryLabels {
  download: string;
  downloadFailed: string;
  /** Lightbox dot label with an `{n}` placeholder, renumbered after missing frames are dropped. */
  goToTemplate: string;
}

interface EpisodeReviewGalleryProps {
  sections: ReviewGallerySection[];
  openFullLabel: string;
  lightboxLabels: LightboxLabels;
  /**
   * Review tone (default) keeps missing frames visible as a signal for the editor. Kit tone is
   * for guests: neutral colours, a download button per frame, and frames that 404 are dropped.
   */
  kit?: ShareKitGalleryLabels;
}

const TONE = {
  review: {
    heading: "text-review",
    card: "border-review/25 hover:border-review/60 focus-visible:ring-review/60",
  },
  kit: {
    heading: "text-muted",
    card: "border-edge hover:border-accent focus-visible:ring-secondary/60",
  },
} as const;

/** CDN allows CORS from the site, so a blob keeps the file name; fall back to opening it. */
async function downloadAsset(url: string, fileName: string): Promise<boolean> {
  try {
    // The <img> already cached this URL without CORS headers; reusing that entry fails the fetch.
    const res = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!res.ok) return false;
    const objectUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    return true;
  } catch {
    return false;
  }
}

function DownloadButton({
  item,
  labels,
}: {
  item: ReviewGalleryItem;
  labels: ShareKitGalleryLabels;
}) {
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");
  const fileName = item.downloadName ?? item.url.split("/").pop() ?? "image";

  return (
    <button
      type="button"
      disabled={status === "busy"}
      onClick={async () => {
        setStatus("busy");
        const ok = await downloadAsset(item.url, fileName);
        if (ok) {
          setStatus("idle");
          return;
        }
        setStatus("error");
        window.open(item.url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => setStatus("idle"), 2400);
      }}
      className="border-edge text-primary hover:border-accent focus-visible:ring-secondary/60 inline-flex min-h-10 items-center gap-2 self-start rounded-sm border px-3 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-progress disabled:opacity-60"
      aria-label={`${labels.download}: ${item.alt}`}
    >
      <IconDownload size={13} className="text-accent-text" />
      {status === "error" ? labels.downloadFailed : labels.download}
      <span className="text-muted tracking-normal normal-case">{fileName}</span>
    </button>
  );
}

type Shape = "landscape" | "portrait" | "square";

function shapeOf(item: ReviewGalleryItem): Shape {
  const ratio = item.width / item.height;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.8) return "portrait";
  return "square";
}

/** Landscape frames take the full row, stories take two rows; squares fill the gaps. */
const SHAPE_SPAN: Record<Shape, string> = {
  landscape: "sm:col-span-2",
  portrait: "sm:row-span-2",
  square: "",
};

const SHAPE_SIZES: Record<Shape, string> = {
  landscape: "(min-width: 1024px) 720px, 100vw",
  portrait: "(min-width: 1024px) 350px, (min-width: 640px) 50vw, 100vw",
  square: "(min-width: 1024px) 350px, (min-width: 640px) 50vw, 100vw",
};

function toLightboxItem(item: ReviewGalleryItem): LightboxItem {
  return {
    key: item.key,
    src: item.url,
    width: item.width,
    height: item.height,
    title: item.layoutLabel,
    subtitle: [item.themeLabel, `${item.width}×${item.height}`, ...item.usedForLabels]
      .filter(Boolean)
      .join(" · "),
    alt: item.alt,
    goToLabel: item.goToLabel,
    kind: item.kind,
  };
}

function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function EpisodeReviewGallery({
  sections: allSections,
  openFullLabel,
  lightboxLabels,
  kit,
}: EpisodeReviewGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [missing, setMissing] = useState<ReadonlySet<string>>(() => new Set());
  // Cache-busted URL per frame that failed once; see markMissing.
  const [retryUrls, setRetryUrls] = useState<ReadonlyMap<string, string>>(() => new Map());
  const cardRefs = useRef(new Map<number, HTMLAnchorElement>());
  const focusAfterCloseRef = useRef<number | null>(null);
  const tone = kit ? TONE.kit : TONE.review;

  /**
   * A browser that saw a frame 404 before it was uploaded keeps serving that failure from its
   * cache, so retry once with a cache-busting query before treating the frame as missing.
   */
  const markMissing = (item: ReviewGalleryItem) => {
    if (!kit) return;
    if (!retryUrls.has(item.key)) {
      const sep = item.url.includes("?") ? "&" : "?";
      setRetryUrls((prev) => new Map(prev).set(item.key, `${item.url}${sep}retry=${Date.now()}`));
      return;
    }
    setMissing((prev) => (prev.has(item.key) ? prev : new Set(prev).add(item.key)));
  };

  const sections = kit
    ? allSections.map((section) => ({
        ...section,
        items: section.items
          .filter((item) => !missing.has(item.key))
          .map((item) => {
            const retryUrl = retryUrls.get(item.key);
            return retryUrl ? { ...item, url: retryUrl } : item;
          }),
      }))
    : allSections;

  // Restore focus only once the modal dialog is gone; while it is open the page is inert.
  useEffect(() => {
    if (openIndex !== null || focusAfterCloseRef.current === null) return;
    cardRefs.current.get(focusAfterCloseRef.current)?.focus();
    focusAfterCloseRef.current = null;
  }, [openIndex]);

  const allItems = sections.flatMap((section) => section.items);
  const lightboxItems = allItems.map((item, i) => ({
    ...toLightboxItem(item),
    ...(kit ? { goToLabel: kit.goToTemplate.replace("{n}", String(i + 1)) } : {}),
  }));
  const offsets = sections.map((_, i) =>
    sections.slice(0, i).reduce((sum, section) => sum + section.items.length, 0),
  );

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <div key={section.key}>
          <h3
            className={cn(
              "mb-3 font-mono text-[9px] tracking-[0.22em] uppercase sm:text-[10px]",
              tone.heading,
            )}
          >
            {section.heading}
          </h3>
          {section.items.length === 0 && section.emptyNote ? (
            <p className="border-edge text-muted rounded-sm border border-dashed px-4 py-5 font-mono text-[11px] leading-relaxed">
              {section.emptyNote}
            </p>
          ) : null}
          <ul className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-flow-dense sm:grid-cols-2">
            {section.items.map((item, itemIndex) => {
              const globalIndex = offsets[sectionIndex] + itemIndex;
              const shape = shapeOf(item);
              return (
                <li
                  key={item.key}
                  // Kit pairs dark/light per format, so every frame keeps one cell.
                  className={cn("flex min-w-0 flex-col gap-2", !kit && SHAPE_SPAN[shape])}
                >
                  {/* Always one line, so neighbouring images start at the same height in any language. */}
                  <div className="flex min-w-0 items-baseline gap-2 font-mono text-[10px] tracking-wide whitespace-nowrap sm:text-[11px]">
                    <span className="text-primary shrink-0 font-medium">{item.layoutLabel}</span>
                    {item.themeLabel ? (
                      <span className="text-muted min-w-0 truncate">{item.themeLabel}</span>
                    ) : null}
                    <span className="text-muted ml-auto shrink-0 tabular-nums">
                      {item.width}×{item.height}
                    </span>
                  </div>
                  {/* Real link so new-tab and no-JS still open the original; plain clicks open the lightbox. */}
                  <a
                    ref={(el) => {
                      if (el) cardRefs.current.set(globalIndex, el);
                      else cardRefs.current.delete(globalIndex);
                    }}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!isPlainClick(e)) return;
                      e.preventDefault();
                      setOpenIndex(globalIndex);
                    }}
                    className={cn(
                      "group relative block min-h-0 flex-1 cursor-zoom-in overflow-hidden rounded-sm border transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      tone.card,
                      item.theme === "dark"
                        ? "bg-[#0b0f14]"
                        : item.theme === "light"
                          ? "bg-[#f7f9fc]"
                          : "bg-surface-2",
                    )}
                    aria-label={item.alt}
                    aria-haspopup="dialog"
                    title={openFullLabel}
                  >
                    <Image
                      src={item.url}
                      alt=""
                      width={item.width}
                      height={item.height}
                      sizes={kit ? SHAPE_SIZES.square : SHAPE_SIZES[shape]}
                      // Skip the optimiser: its cache would keep showing a file for hours after a re-upload.
                      unoptimized
                      // A frame that 404s before hydration never fires onError, so check on attach too.
                      ref={(el) => {
                        if (el?.complete && el.naturalWidth === 0) markMissing(item);
                      }}
                      onError={() => markMissing(item)}
                      className={cn(
                        "block w-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                        // Inside a two-row cell the story should fill the cell height, not overflow it.
                        shape === "portrait" && !kit
                          ? "h-auto sm:h-full sm:object-contain"
                          : "h-auto",
                      )}
                    />
                    {item.usedForLabels.length > 0 ? (
                      <span className="pointer-events-none absolute top-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                        {item.usedForLabels.map((label) => (
                          <span
                            key={label}
                            className="bg-surface/90 text-review border-review/40 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] whitespace-nowrap uppercase shadow-sm backdrop-blur-md"
                          >
                            {label}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span
                      aria-hidden
                      className="border-edge/60 bg-surface/85 text-primary pointer-events-none absolute right-2 bottom-2 inline-flex size-8 items-center justify-center rounded-sm border opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="square"
                      >
                        <path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5" />
                      </svg>
                    </span>
                  </a>
                  {kit ? <DownloadButton item={item} labels={kit} /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {openIndex === null ? null : (
        <ReviewLightbox
          items={lightboxItems}
          startIndex={openIndex}
          labels={lightboxLabels}
          onClose={(lastIndex) => {
            focusAfterCloseRef.current = lastIndex;
            setOpenIndex(null);
          }}
        />
      )}
    </>
  );
}
