"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { usePathname } from "@/i18n/navigation";

export interface MobileNavLink {
  href: string;
  label: string;
}

interface MobileNavDrawerProps {
  items: MobileNavLink[];
  listenHref: string;
  listenLabel: string;
  brandLabel: string;
  openNavigationAria: string;
  closeNavigationAria: string;
}

export function MobileNavDrawer({
  items,
  listenHref,
  listenLabel,
  brandLabel,
  openNavigationAria,
  closeNavigationAria,
}: MobileNavDrawerProps) {
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        openBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /** Outside tap: header siblings (lang/theme/play) sit above the scrim; capture covers the full viewport. */
  useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => {
      setOpen(false);
      openBtnRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node;
      if (openBtnRef.current?.contains(node) || panelRef.current?.contains(node)) {
        return;
      }
      close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={openBtnRef}
        type="button"
        className="border-edge text-muted hover:border-primary/35 hover:text-primary focus-visible:ring-secondary/50 focus-visible:ring-offset-bg inline-flex size-10 shrink-0 items-center justify-center rounded-sm border bg-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeNavigationAria : openNavigationAria}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="text-current"
        >
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="square"
            />
          ) : (
            <>
              <path d="M5 7h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
              <path d="M5 12h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
              <path d="M5 17h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
            </>
          )}
        </svg>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-[60] bg-[color-mix(in_srgb,var(--bg)_55%,transparent)] backdrop-blur-[2px] dark:bg-[color-mix(in_srgb,var(--bg)_72%,transparent)]"
            aria-hidden
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={openNavigationAria}
            className="border-edge fixed top-16 right-3 left-3 z-[70] max-h-[min(32rem,calc(100dvh-5rem))] overflow-x-hidden overflow-y-auto rounded-sm border bg-[color-mix(in_srgb,var(--bg)_94%,var(--secondary)_4%)] shadow-[0_24px_48px_-24px_color-mix(in_srgb,var(--primary)_35%,transparent)] dark:bg-[color-mix(in_srgb,var(--bg)_92%,var(--secondary)_6%)]"
            style={{ animation: "fadeUp 0.22s ease both" }}
          >
            <div
              className="via-accent/35 pointer-events-none absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent to-transparent"
              aria-hidden
            />
            <nav className="flex flex-col p-2">
              <Link
                href={items[0]?.href ?? "/"}
                onClick={() => setOpen(false)}
                className="border-edge/60 hover:bg-surface-2/70 mb-2 flex items-center gap-3 rounded-sm border-b px-4 py-3.5 transition-colors"
              >
                <Image
                  src="/icon.svg"
                  alt=""
                  width={128}
                  height={128}
                  className="h-9 w-9 object-contain dark:hidden"
                  priority
                  aria-hidden
                />
                <Image
                  src="/icon-dark.svg"
                  alt=""
                  width={128}
                  height={128}
                  className="hidden h-9 w-9 object-contain dark:block"
                  priority
                  aria-hidden
                />
                <span className="text-primary font-mono text-[11px] tracking-[0.22em] uppercase">
                  {brandLabel}
                </span>
              </Link>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-edge/60 text-primary hover:bg-surface-2/90 rounded-sm border-b px-4 py-3.5 font-mono text-xs tracking-[0.2em] uppercase transition-colors last:border-b-0"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 px-2 pt-2 pb-5">
                <span className="nav-cta-glow-wrap block w-full">
                  <Link
                    href={listenHref}
                    onClick={() => setOpen(false)}
                    className="premium-cta cta-on-lime relative z-[1] flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3.5 font-mono text-xs font-medium tracking-widest uppercase shadow-[inset_0_1px_0_rgb(255_255_255/0.38),0_4px_14px_-4px_var(--accent)] transition-all duration-200 hover:scale-[1.01] hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#0b0f14]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--accent)] focus-visible:outline-none active:scale-[0.99]"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="shrink-0 translate-x-[1px]"
                      aria-hidden
                    >
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                    {listenLabel}
                  </Link>
                </span>
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
