"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/cn";

import { IconShare } from "../ui/icons";

const SHARE_TEXT_MAX = 2000;

interface EpisodeShareButtonProps {
  shareTitle: string;
  shareText: string;
  label: string;
  labelAria: string;
  className?: string;
}

export function EpisodeShareButton({
  shareTitle,
  shareText,
  label,
  labelAria,
  className,
}: EpisodeShareButtonProps) {
  const [canShare, setCanShare] = useState(false);

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

  if (!canShare) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={labelAria}
      className={cn(
        "border-edge text-muted hover:border-primary/40 hover:text-primary active:bg-surface-2 inline-flex min-h-11 items-center gap-2 rounded-sm border px-3 py-2 font-mono text-[11px] tracking-widest uppercase transition-colors sm:text-xs",
        className,
      )}
    >
      <IconShare size={15} className="text-secondary/65" />
      {label}
    </button>
  );
}
