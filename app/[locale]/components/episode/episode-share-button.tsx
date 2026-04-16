"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { IconCopyLink, IconShare } from "../ui/icons";

const SHARE_TEXT_MAX = 2000;
const COPY_STATUS_MS = 2200;

interface EpisodeShareButtonProps {
  shareTitle: string;
  shareText: string;
  label: string;
  labelAria: string;
  copyLabel: string;
  copyAria: string;
  copiedLabel: string;
  copyFailedLabel: string;
  className?: string;
}

const chipBtn =
  "border-edge text-muted hover:border-primary/40 hover:text-primary active:bg-surface-2 inline-flex min-h-11 items-center gap-2 rounded-sm border px-3 py-2 font-mono text-[11px] tracking-widest uppercase transition-colors sm:text-xs";

export function EpisodeShareButton({
  shareTitle,
  shareText,
  label,
  labelAria,
  copyLabel,
  copyAria,
  copiedLabel,
  copyFailedLabel,
  className,
}: EpisodeShareButtonProps) {
  const [canShare, setCanShare] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        return;
      }
      const url = window.location.href;
      const text = shareText.slice(0, SHARE_TEXT_MAX);
      const data: ShareData = { title: shareTitle, text, url };
      if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
        return;
      }
      setCanShare(true);
    });
  }, [shareTitle, shareText]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const onShare = useCallback(async () => {
    if (!canShare || typeof navigator.share !== "function") {
      return;
    }
    const url = window.location.href;
    const text = shareText.slice(0, SHARE_TEXT_MAX);
    try {
      await navigator.share({ title: shareTitle, text, url });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      console.warn(e);
    }
  }, [canShare, shareTitle, shareText]);

  const onCopyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopyStatus("idle");
      copyTimerRef.current = null;
    }, COPY_STATUS_MS);
  }, []);

  const copyVisible =
    copyStatus === "copied" ? copiedLabel : copyStatus === "error" ? copyFailedLabel : copyLabel;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {canShare ? (
        <button type="button" onClick={onShare} aria-label={labelAria} className={chipBtn}>
          <IconShare size={15} className="text-secondary/65" />
          {label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onCopyLink}
        aria-label={copyAria}
        className={cn(
          chipBtn,
          copyStatus === "copied" && "border-accent/35 text-accent-text",
          copyStatus === "error" && "border-secondary/40 text-secondary",
        )}
      >
        <IconCopyLink size={15} className="text-secondary/65" />
        {copyVisible}
      </button>
    </div>
  );
}
