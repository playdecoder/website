"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/ui/cn";

import { useRemoteImageInfo } from "./use-remote-image-info";

export interface ReviewSpecsTarget {
  src: string;
  /** Size the layout is rendered at; anything else means a wrong or stale upload. */
  expectedWidth: number | null;
  expectedHeight: number | null;
  kind: "cover" | "social" | "web";
  /** Decoded size from the loaded <img>, used when the file itself can't be read. */
  natural: { width: number; height: number } | null;
}

interface ReviewSpecsPanelProps {
  target: ReviewSpecsTarget;
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
}

/** Apple Podcasts artwork rules; Spotify and others accept the same. */
const COVER_MIN_PX = 1400;
const COVER_MAX_PX = 3000;

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function aspectRatio(width: number, height: number, locale: string) {
  const d = greatestCommonDivisor(width, height);
  if (width / d <= 32 && height / d <= 32) return `${width / d}:${height / d}`;
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return width >= height ? `${nf.format(width / height)}:1` : `1:${nf.format(height / width)}`;
}

function formatBytes(bytes: number, locale: string) {
  const format = (value: number, digits: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${format(bytes / 1000, bytes < 10_000 ? 1 : 0)} kB`;
  return `${format(bytes / 1_000_000, 2)} MB`;
}

function relativeAge(timestamp: number, now: number, locale: string) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const seconds = Math.round((timestamp - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(seconds / 86_400), "day");
  return rtf.format(Math.round(seconds / 2_592_000), "month");
}

function fileName(src: string) {
  try {
    // The base only matters for site-relative paths like /social/art/…
    return decodeURIComponent(new URL(src, "https://x.invalid").pathname.split("/").pop() || src);
  } catch {
    return src;
  }
}

function Skeleton() {
  return <span aria-hidden className="bg-primary/10 block h-3 w-24 animate-pulse rounded-sm" />;
}

const ICON = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "square" as const,
  "aria-hidden": true,
};

export function ReviewSpecsPanel({ target, onClose, className, style }: ReviewSpecsPanelProps) {
  const t = useTranslations("listen");
  const locale = useLocale();
  const state = useRemoteImageInfo(target.src);
  const [copied, setCopied] = useState(false);

  const info = state.status === "ready" ? state.info : null;
  const specs = info?.specs ?? null;
  const loading = state.status === "loading";
  const width = specs?.width ?? target.natural?.width ?? null;
  const height = specs?.height ?? target.natural?.height ?? null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(target.src, window.location.href).href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (permissions, insecure origin); the link is still in the top bar.
    }
  };

  const rows: Array<{ key: string; label: string; value: ReactNode; title?: string }> = [
    {
      key: "resolution",
      label: t("specsResolution"),
      value: width && height ? `${width} × ${height} px` : null,
    },
    {
      key: "aspect",
      label: t("specsAspect"),
      value: width && height ? aspectRatio(width, height, locale) : null,
    },
    {
      key: "format",
      label: t("specsFormat"),
      value: specs
        ? [
            specs.format === "unknown" ? (info?.contentType ?? "?") : specs.format,
            ...specs.encoding,
          ]
            .filter(Boolean)
            .join(" · ")
        : null,
    },
    { key: "color", label: t("specsColor"), value: specs?.colorMode ?? null },
    {
      key: "depth",
      label: t("specsDepth"),
      value:
        specs?.bitDepth != null && specs.bitsPerPixel != null
          ? t("specsDepthValue", { bits: specs.bitDepth, bpp: specs.bitsPerPixel })
          : null,
    },
    {
      key: "profile",
      label: t("specsProfile"),
      value: specs ? (specs.colorProfile ?? t("specsProfileNone")) : null,
    },
    {
      key: "size",
      label: t("specsFileSize"),
      value: info?.bytes != null ? formatBytes(info.bytes, locale) : null,
      title:
        info?.bytes != null ? `${new Intl.NumberFormat(locale).format(info.bytes)} B` : undefined,
    },
    {
      key: "modified",
      label: t("specsUploaded"),
      value:
        info?.lastModified != null
          ? `${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
              info.lastModified,
            )} · ${relativeAge(info.lastModified, info.fetchedAt, locale)}`
          : null,
    },
  ];

  const checks: Array<{ key: string; ok: boolean; text: string }> = [];
  if (width && height) {
    if (target.expectedWidth !== null && target.expectedHeight !== null) {
      const matches = width === target.expectedWidth && height === target.expectedHeight;
      checks.push({
        key: "size",
        ok: matches,
        text: matches
          ? t("specsCheckSizeOk")
          : t("specsCheckSizeWrong", {
              width: target.expectedWidth,
              height: target.expectedHeight,
            }),
      });
    }
    if (target.kind === "web") {
      // 1920×1080, 1600×900 and 3840×2160 all pass; anything visibly off 16:9 doesn't.
      const ok = Math.abs(width / height - 16 / 9) < 0.01;
      checks.push({
        key: "keyart-aspect",
        ok,
        text: ok ? t("specsCheckKeyartAspectOk") : t("specsCheckKeyartAspectWrong"),
      });
    }
    if (target.kind === "cover") {
      const ok = width === height && width >= COVER_MIN_PX && width <= COVER_MAX_PX;
      checks.push({
        key: "cover-size",
        ok,
        text: ok ? t("specsCheckCoverSizeOk") : t("specsCheckCoverSizeWrong"),
      });
    }
  }
  if (specs && specs.format !== "unknown") {
    if (target.kind === "cover") {
      const ok = (specs.format === "JPEG" || specs.format === "PNG") && specs.colorMode === "RGB";
      checks.push({
        key: "cover-format",
        ok,
        text: ok ? t("specsCheckCoverFormatOk") : t("specsCheckCoverFormatWrong"),
      });
    }
    const profileOk = !specs.colorProfile || /srgb/i.test(specs.colorProfile);
    checks.push({
      key: "profile",
      ok: profileOk,
      text: profileOk
        ? t("specsCheckProfileOk")
        : t("specsCheckProfileWrong", { profile: specs.colorProfile ?? "" }),
    });
  }

  return (
    <aside aria-label={t("specsHeading")} className={cn("flex flex-col", className)} style={style}>
      <div className="border-edge/50 flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-review font-mono text-[10px] font-medium tracking-[0.22em] uppercase">
          {t("specsHeading")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("specsHide")}
          className="text-muted hover:text-primary focus-visible:ring-review/60 -mr-1.5 inline-flex size-8 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <svg {...ICON}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="border-edge/40 flex items-center gap-2 border-b px-4 py-3">
        <span className="text-primary min-w-0 flex-1 truncate font-mono text-xs" title={target.src}>
          {fileName(target.src)}
        </span>
        <button
          type="button"
          onClick={copyLink}
          className="border-edge/60 text-muted hover:border-review/50 hover:text-review focus-visible:ring-review/60 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm border px-2 font-mono text-[10px] tracking-wide transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <svg {...ICON}>
            {copied ? (
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            ) : (
              <>
                <path d="M9 9h10v10H9z" />
                <path d="M15 9V5H5v10h4" />
              </>
            )}
          </svg>
          <span aria-live="polite">{copied ? t("specsCopied") : t("specsCopyLink")}</span>
        </button>
      </div>

      <dl className="divide-edge/35 divide-y px-4">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-3 py-2.5"
          >
            <dt className="text-muted font-mono text-[10px] tracking-[0.14em] uppercase">
              {row.label}
            </dt>
            <dd
              className="text-primary font-mono text-xs leading-snug break-words tabular-nums"
              title={row.title}
            >
              {row.value ?? (loading ? <Skeleton /> : <span className="text-muted">—</span>)}
            </dd>
          </div>
        ))}
      </dl>

      {checks.length > 0 ? (
        <div className="border-edge/50 mt-1 border-t px-4 py-4">
          <h3 className="text-muted mb-2.5 font-mono text-[10px] tracking-[0.22em] uppercase">
            {t("specsChecksHeading")}
          </h3>
          <ul className="space-y-2">
            {checks.map((check) => (
              <li
                key={check.key}
                className="flex items-start gap-2 font-mono text-[11px] leading-snug"
              >
                <span
                  className={cn(
                    "mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full",
                    check.ok ? "bg-primary/10 text-primary" : "bg-review/15 text-review",
                  )}
                >
                  <svg {...ICON} width={10} height={10} strokeWidth={2.5}>
                    {check.ok ? (
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    ) : (
                      <path d="M12 5v9M12 18.5v.5" />
                    )}
                  </svg>
                </span>
                <span className={check.ok ? "text-muted" : "text-primary"}>{check.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.status === "error" ? (
        <p className="border-edge/50 text-muted mt-auto border-t px-4 py-3 font-mono text-[10px] leading-relaxed">
          {t("specsUnavailable")}
        </p>
      ) : null}
    </aside>
  );
}
