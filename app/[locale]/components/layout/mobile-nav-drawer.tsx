"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PANEL_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SCRIM_MS = 340;
const PANEL_MS = 420;
const ITEM_STAGGER_MS = 40;
const ITEM_BASE_DELAY_MS = 64;
const ITEM_TRANSITION_MS = 320;
/** Must cover last stagger + item transition + small buffer */
const UNMOUNT_AFTER_MS = 480;

export interface MobileNavLink {
  href: string;
  label: string;
}

interface MobileNavDrawerProps {
  items: MobileNavLink[];
  listenHref: string;
  listenLabel: string;
  openNavigationAria: string;
  closeNavigationAria: string;
}

export function MobileNavDrawer({
  items,
  listenHref,
  listenLabel,
  openNavigationAria,
  closeNavigationAria,
}: MobileNavDrawerProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setEntered(false);
      let innerRaf = 0;
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(outerRaf);
        cancelAnimationFrame(innerRaf);
      };
    }

    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), UNMOUNT_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

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

  const ctaDelayMs = ITEM_BASE_DELAY_MS + items.length * ITEM_STAGGER_MS + 48;

  return (
    <div className="md:hidden">
      <button
        ref={openBtnRef}
        type="button"
        className="border-edge text-muted hover:border-primary/35 hover:text-primary focus-visible:ring-secondary/50 focus-visible:ring-offset-bg inline-flex size-10 shrink-0 items-center justify-center rounded-sm border bg-transparent transition-[transform,color,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.96] data-[open]:border-primary/25 data-[open]:text-primary motion-reduce:transition-none motion-reduce:active:scale-100"
        data-open={mounted || undefined}
        aria-expanded={mounted}
        aria-controls={mounted ? panelId : undefined}
        aria-label={mounted ? closeNavigationAria : openNavigationAria}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="text-current transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
          style={{ transform: mounted ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          {mounted ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="square"
              className="motion-safe:[transition:opacity_0.22s_ease,transform_0.38s_cubic-bezier(0.32,0.72,0,1)]"
              style={{
                opacity: entered ? 1 : 0,
                transform: entered ? "scale(1)" : "scale(0.82) rotate(-45deg)",
              }}
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

      {mounted && typeof document !== "undefined"
        ? createPortal(
            <>
              {/*
                Portaled to body so `fixed` is not trapped by the header’s backdrop-filter
                stacking context. Scrim starts below the navbar (top-16): bar stays sharp,
                page content underneath is blurred.
              */}
              <div
                className="fixed top-16 right-0 bottom-0 left-0 z-40 bg-[color-mix(in_srgb,var(--bg)_38%,transparent)] backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-[var(--mobile-nav-scrim-ms,340ms)] ease-out motion-reduce:transition-none dark:bg-[color-mix(in_srgb,var(--bg)_52%,transparent)]"
                style={
                  {
                    "--mobile-nav-scrim-ms": `${SCRIM_MS}ms`,
                    opacity: entered ? 1 : 0,
                    pointerEvents: entered ? "auto" : "none",
                  } as CSSProperties
                }
                aria-hidden
              />
              <div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-label={openNavigationAria}
                className="border-edge fixed top-16 right-3 left-3 z-[45] max-h-[min(32rem,calc(100dvh-5rem))] overflow-x-hidden overflow-y-auto rounded-sm border bg-[color-mix(in_srgb,var(--bg)_94%,var(--secondary)_4%)] shadow-[0_28px_56px_-28px_color-mix(in_srgb,var(--primary)_38%,transparent)] transition-[opacity,transform,box-shadow] duration-[var(--mobile-nav-panel-ms,420ms)] ease-[var(--mobile-nav-ease)] will-change-[transform,opacity] motion-reduce:transition-none motion-reduce:duration-0 dark:bg-[color-mix(in_srgb,var(--bg)_92%,var(--secondary)_6%)] dark:shadow-[0_28px_56px_-32px_rgb(0_0_0/0.5)]"
                style={
                  {
                    "--mobile-nav-panel-ms": `${PANEL_MS}ms`,
                    "--mobile-nav-ease": PANEL_EASE,
                    opacity: entered ? 1 : 0,
                    transform: entered
                      ? "translateY(0) scale(1)"
                      : "translateY(calc(-0.35rem - 4px)) scale(0.97)",
                    boxShadow: entered
                      ? undefined
                      : "0 12px 28px -18px color-mix(in srgb, var(--primary) 22%, transparent)",
                                   } as CSSProperties
                }
              >
                <div
                  className="via-accent/35 pointer-events-none absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent to-transparent motion-safe:transition-opacity motion-safe:duration-500"
                  style={{ opacity: entered ? 1 : 0 }}
                  aria-hidden
                />
                <nav className="flex flex-col p-2">
                  {items.map((item, index) => {
                    const delayIn = ITEM_BASE_DELAY_MS + index * ITEM_STAGGER_MS;
                    const delayOut = Math.max(0, (items.length - 1 - index) * 28);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="border-edge/60 text-primary hover:bg-surface-2/90 rounded-sm border-b px-4 py-3.5 font-mono text-xs tracking-[0.2em] uppercase transition-[opacity,transform,background-color,color] motion-reduce:!translate-x-0 motion-reduce:!opacity-100 motion-reduce:!delay-0 motion-reduce:transition-none last:border-b-0"
                        style={{
                          transitionDuration: `${ITEM_TRANSITION_MS}ms`,
                          transitionTimingFunction: PANEL_EASE,
                          transitionDelay: entered ? `${delayIn}ms` : `${delayOut}ms`,
                          opacity: entered ? 1 : 0,
                          transform: entered ? "translateX(0)" : "translateX(-0.65rem)",
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <div
                    className="mt-2 px-2 pt-2 pb-5 transition-[opacity,transform] motion-reduce:!translate-y-0 motion-reduce:!opacity-100 motion-reduce:!delay-0 motion-reduce:transition-none"
                    style={{
                      transitionDuration: `${ITEM_TRANSITION_MS}ms`,
                      transitionTimingFunction: PANEL_EASE,
                      transitionDelay: entered ? `${ctaDelayMs}ms` : "0ms",
                      opacity: entered ? 1 : 0,
                      transform: entered ? "translateY(0)" : "translateY(0.5rem)",
                    }}
                  >
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
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
