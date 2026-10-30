"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/ui/cn";

import { IconCheck, IconCopy, IconExternalLink } from "../../../components/ui/icons";

const COPY_STATUS_MS = 2000;

type CopyStatus = "idle" | "copied" | "error";

export interface KitCopyLabels {
  copy: string;
  copied: string;
  copyFailed: string;
}

/** In-app browsers (Messenger, Instagram, LinkedIn) often deny the async clipboard API. */
function copyWithTextarea(text: string): boolean {
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.append(el);
  el.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    el.remove();
  }
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithTextarea(text);
  }
}

function useCopy(text: string) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = async () => {
    setStatus((await writeClipboard(text)) ? "copied" : "error");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), COPY_STATUS_MS);
  };

  return { status, copy };
}

function StatusLabel({ status, labels }: { status: CopyStatus; labels: KitCopyLabels }) {
  if (status === "copied") {
    return (
      <span className="text-accent-text inline-flex items-center gap-1.5">
        <IconCheck size={13} />
        {labels.copied}
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-secondary">{labels.copyFailed}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <IconCopy size={13} className="text-accent-text" />
      {labels.copy}
    </span>
  );
}

interface KitLinkRowProps {
  label: string;
  url: string;
  copyAria: string;
  openLabel: string;
  openAria: string;
  labels: KitCopyLabels;
}

/** The whole row copies the URL; the trailing icon opens it. */
export function KitLinkRow({ label, url, copyAria, openLabel, openAria, labels }: KitLinkRowProps) {
  const { status, copy } = useCopy(url);
  const display = url.replace(/^https?:\/\//, "");

  return (
    <li className="flex items-stretch">
      <button
        type="button"
        onClick={copy}
        className="hover:bg-surface-2/70 focus-visible:ring-secondary/60 group flex min-h-14 min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-4 sm:px-5"
        aria-label={copyAria}
      >
        <span className="text-muted shrink-0 font-mono text-[10px] tracking-[0.14em] uppercase sm:w-36">
          {label}
        </span>
        <span className="text-primary min-w-0 flex-1 truncate font-mono text-xs sm:text-[13px]">
          {display}
        </span>
        <span
          className="text-muted group-hover:text-primary shrink-0 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors"
          aria-live="polite"
        >
          <StatusLabel status={status} labels={labels} />
        </span>
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="border-edge/60 text-muted hover:text-primary hover:bg-surface-2/70 focus-visible:ring-secondary/60 flex w-12 shrink-0 items-center justify-center border-l transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:w-14"
        aria-label={openAria}
        title={openLabel}
      >
        <IconExternalLink size={15} />
      </a>
    </li>
  );
}

interface KitCopyButtonProps {
  text: string;
  aria: string;
  labels: KitCopyLabels;
  className?: string;
}

export function KitCopyButton({ text, aria, labels, className }: KitCopyButtonProps) {
  const { status, copy } = useCopy(text);

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "border-edge text-primary hover:border-accent focus-visible:ring-secondary/60 inline-flex min-h-10 shrink-0 items-center rounded-sm border px-3 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
      aria-label={aria}
    >
      <span aria-live="polite">
        <StatusLabel status={status} labels={labels} />
      </span>
    </button>
  );
}
