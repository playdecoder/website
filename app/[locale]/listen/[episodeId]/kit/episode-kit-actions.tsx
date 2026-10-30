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

function StatusLabel({
  status,
  labels,
  compactOnPhone = false,
}: {
  status: CopyStatus;
  labels: KitCopyLabels;
  /** Icon only below `sm`, text kept for screen readers. */
  compactOnPhone?: boolean;
}) {
  const text = cn(compactOnPhone && "max-sm:sr-only");
  if (status === "copied") {
    return (
      <span className="text-accent-text inline-flex items-center gap-1.5">
        <IconCheck size={13} />
        <span className={text}>{labels.copied}</span>
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-secondary">{labels.copyFailed}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <IconCopy size={13} className="text-accent-text" />
      <span className={text}>{labels.copy}</span>
    </span>
  );
}

interface KitLinkRowProps {
  label: string;
  /** Our own link (dekoder.fm/…), shown first. */
  url: string;
  /** The platform's own URL, shown underneath when it exists. */
  directUrl?: string;
  /** Caveat shown instead of the direct link, e.g. that it lands on the episode page for now. */
  note?: string;
  copyAria: string;
  copyDirectAria: string;
  openAria: string;
  openDirectAria: string;
  openLabel: string;
  labels: KitCopyLabels;
}

/** Readable form for display only (no scheme, `vojt%C4%9Bch` → `vojtěch`); copy keeps the raw URL. */
function displayUrl(url: string): string {
  const bare = url.replace(/^https?:\/\//, "");
  try {
    return decodeURI(bare);
  } catch {
    return bare;
  }
}

const miniButton =
  "focus-visible:ring-secondary/60 inline-flex h-8 shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none";

function CopyChip({ text, aria, labels }: { text: string; aria: string; labels: KitCopyLabels }) {
  const { status, copy } = useCopy(text);
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={aria}
      className={cn(
        miniButton,
        "border-edge text-primary hover:border-accent justify-self-end border font-mono text-[9px] tracking-[0.14em] uppercase max-sm:w-8 sm:px-2.5",
      )}
    >
      <span aria-live="polite">
        <StatusLabel status={status} labels={labels} compactOnPhone />
      </span>
    </button>
  );
}

function CopyIcon({ text, aria, labels }: { text: string; aria: string; labels: KitCopyLabels }) {
  const { status, copy } = useCopy(text);
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={aria}
      title={status === "copied" ? labels.copied : aria}
      className={cn(
        miniButton,
        "hover:border-edge text-muted hover:text-primary size-8 justify-self-end border border-transparent",
      )}
    >
      {status === "copied" ? (
        <IconCheck size={13} className="text-accent-text" />
      ) : (
        <IconCopy size={13} />
      )}
      <span className="sr-only" aria-live="polite">
        {status === "copied" ? labels.copied : status === "error" ? labels.copyFailed : ""}
      </span>
    </button>
  );
}

function OpenIcon({ href, aria, title }: { href: string; aria: string; title: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={aria}
      title={title}
      className={cn(miniButton, "text-muted hover:text-primary hover:bg-surface-2/70 size-8")}
    >
      <IconExternalLink size={14} />
    </a>
  );
}

/**
 * One link per row: our short link on top, the platform's own URL underneath. Each line has its
 * own copy and open buttons, in shared columns so they line up row to row.
 */
export function KitLinkRow({
  label,
  url,
  directUrl,
  note,
  copyAria,
  copyDirectAria,
  openAria,
  openDirectAria,
  openLabel,
  labels,
}: KitLinkRowProps) {
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:gap-5 sm:px-5">
      <span className="text-muted shrink-0 font-mono text-[10px] tracking-[0.14em] uppercase sm:w-32 sm:pt-[9px]">
        {label}
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1.5 gap-y-0.5">
        <span className="text-primary truncate font-mono text-xs" title={url}>
          {displayUrl(url)}
        </span>
        <CopyChip text={url} aria={copyAria} labels={labels} />
        <OpenIcon href={url} aria={openAria} title={openLabel} />

        {directUrl ? (
          <>
            <span className="text-muted flex min-w-0 items-baseline gap-1.5 font-mono text-[11px]">
              <span className="text-edge shrink-0" aria-hidden>
                ↳
              </span>
              <span className="truncate" title={directUrl}>
                {displayUrl(directUrl)}
              </span>
            </span>
            <CopyIcon text={directUrl} aria={copyDirectAria} labels={labels} />
            <OpenIcon href={directUrl} aria={openDirectAria} title={openLabel} />
          </>
        ) : note ? (
          <p className="text-muted col-span-3 pb-1 font-mono text-[10px] leading-snug">{note}</p>
        ) : null}
      </div>
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
