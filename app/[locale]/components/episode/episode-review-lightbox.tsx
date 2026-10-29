"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/ui/cn";

import { ReviewSpecsPanel } from "./episode-review-specs";
import { clearRemoteImageInfoCache } from "./use-remote-image-info";

export interface LightboxItem {
  key: string;
  src: string;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  alt: string;
  goToLabel: string;
  /** Covers are checked against podcast-app artwork rules, social frames only for size. */
  kind: "cover" | "social" | "web";
}

export interface LightboxLabels {
  dialog: string;
  close: string;
  prev: string;
  next: string;
  openOriginal: string;
  zoomIn: string;
  resetZoom: string;
  hintTouch: string;
  hintPointer: string;
  specs: string;
}

interface ReviewLightboxProps {
  items: LightboxItem[];
  startIndex: number;
  labels: LightboxLabels;
  /** Called after the exit animation with the index the viewer ended on. */
  onClose: (lastIndex: number) => void;
}

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SETTLE_MS = 300;
const EXIT_MS = 220;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 30;
const TAP_SLOP_PX = 10;
const TAP_MAX_MS = 280;
const AXIS_LOCK_PX = 8;
const SWIPE_DISTANCE_RATIO = 0.18;
const SWIPE_VELOCITY = 0.45; // px per ms
const DISMISS_DISTANCE_PX = 120;
const DISMISS_VELOCITY = 0.55; // px per ms
const EDGE_RESISTANCE = 0.35;
const VELOCITY_STALE_MS = 90;

type Point = { x: number; y: number };
type View = { x: number; y: number; s: number };
type Mode = "pending" | "pan" | "pinch" | "swipe" | "dismiss" | "ignore";

interface Gesture {
  mode: Mode;
  start: Point;
  startTime: number;
  startView: View;
  last: Point;
  lastTime: number;
  velocity: Point;
  pinchDistance: number;
  pinchMid: Point;
  onImage: boolean;
}

const IDENTITY: View = { x: 0, y: 0, s: 1 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Past the limit, follow the finger at reduced speed (iOS-style overscroll). */
function rubberBand(value: number, min: number, max: number) {
  if (value < min) return min + (value - min) * EDGE_RESISTANCE;
  if (value > max) return max + (value - max) * EDGE_RESISTANCE;
  return value;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const ICON = {
  strokeWidth: 1.75,
  stroke: "currentColor",
  strokeLinecap: "square" as const,
  fill: "none",
};

const iconButton =
  "border-edge/70 bg-surface/80 text-primary hover:border-review/55 hover:text-review focus-visible:ring-review/60 inline-flex size-10 shrink-0 items-center justify-center rounded-sm border backdrop-blur-md transition-[color,border-color,transform,opacity] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30 motion-reduce:transition-none";

/**
 * Full-screen viewer for the review gallery. Touch: pinch or double-tap to zoom, drag to pan,
 * swipe sideways to browse, pull down to close. Pointer: double-click or Ctrl + wheel to zoom,
 * arrow keys to browse, +/−/0 to zoom, Esc to close. Transforms are written straight to the DOM
 * during gestures so React only re-renders on index or zoom-level changes.
 */
export function ReviewLightbox({ items, startIndex, labels, onClose }: ReviewLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  // Mounted only after a click, so window is available. Desktop starts with specs visible.
  const [specsOpen, setSpecsOpen] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  const [naturalSizes, setNaturalSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const rootRef = useRef<HTMLDialogElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const imageRefs = useRef(new Map<number, HTMLImageElement>());
  const indexRef = useRef(startIndex);
  const viewRef = useRef<View>(IDENTITY);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null);
  const closingRef = useRef(false);

  const count = items.length;
  const current = items[index];

  // ── DOM writers ────────────────────────────────────────────────────────────

  const transitionFor = (property: string, ms: number) =>
    ms > 0 && !reducedMotion() ? `${property} ${ms}ms ${EASE}` : "none";

  const writeImage = (transform: string, ms: number) => {
    const img = imageRefs.current.get(indexRef.current);
    if (!img) return;
    const move = transitionFor("transform", ms);
    // Keep the load fade-in alive alongside transform animations.
    img.style.transition = move === "none" ? "opacity 300ms ease" : `${move}, opacity 300ms ease`;
    img.style.transform = transform;
  };

  const applyView = (view: View, ms = 0) => {
    viewRef.current = view;
    writeImage(`translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`, ms);
  };

  const applyTrack = (dx: number, ms = 0) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = transitionFor("transform", ms);
    track.style.transform = `translate3d(calc(${-indexRef.current * 100}% + ${dx}px), 0, 0)`;
  };

  /** 1 = fully shown; lower values fade the backdrop and chrome while pulling to close. */
  const applyPresence = (presence: number, ms = 0) => {
    const backdrop = backdropRef.current;
    const root = rootRef.current;
    if (backdrop) {
      backdrop.style.transition = transitionFor("opacity", ms);
      backdrop.style.opacity = String(presence);
    }
    root?.style.setProperty("--lightbox-chrome", String(clamp(presence * 1.6 - 0.6, 0, 1)));
  };

  // ── Geometry ───────────────────────────────────────────────────────────────

  const stageCenter = (): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 };
  };

  /** How far the scaled image may travel from centre before showing empty stage. */
  const panLimits = (scale: number): Point => {
    const img = imageRefs.current.get(indexRef.current);
    const stage = stageRef.current;
    if (!img || !stage) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (img.offsetWidth * scale - stage.clientWidth) / 2),
      y: Math.max(0, (img.offsetHeight * scale - stage.clientHeight) / 2),
    };
  };

  const clampView = (view: View): View => {
    const s = clamp(view.s, 1, MAX_SCALE);
    if (s <= 1.001) return IDENTITY;
    const limit = panLimits(s);
    return { s, x: clamp(view.x, -limit.x, limit.x), y: clamp(view.y, -limit.y, limit.y) };
  };

  /** Rescale `from` so the image point under `focus` stays under it. */
  const zoomAround = (from: View, focus: Point, s: number): View => {
    const c = stageCenter();
    const px = focus.x - c.x;
    const py = focus.y - c.y;
    const k = s / from.s;
    return { s, x: px - (px - from.x) * k, y: py - (py - from.y) * k };
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const settle = (view: View, ms = SETTLE_MS) => {
    const next = clampView(view);
    applyView(next, ms);
    setZoomPercent(Math.round(next.s * 100));
  };

  const resetZoom = () => settle(IDENTITY);

  const zoomTo = (scale: number, focus: Point = stageCenter()) => {
    settle(zoomAround(viewRef.current, focus, clamp(scale, 1, MAX_SCALE)));
  };

  const goTo = (next: number) => {
    if (next < 0 || next >= count || next === indexRef.current) {
      applyTrack(0, SETTLE_MS);
      return;
    }
    applyView(IDENTITY); // leave the previous slide unzoomed
    setZoomPercent(100);
    indexRef.current = next;
    applyTrack(0, SETTLE_MS);
    setIndex(next);
  };

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => onClose(indexRef.current), reducedMotion() ? 0 : EXIT_MS);
  };

  const handleTap = (point: Point, time: number, onImage: boolean) => {
    const last = lastTapRef.current;
    if (
      last &&
      time - last.time < DOUBLE_TAP_MS &&
      distance(last.point, point) < DOUBLE_TAP_SLOP_PX
    ) {
      lastTapRef.current = null;
      if (viewRef.current.s > 1.01) resetZoom();
      else zoomTo(DOUBLE_TAP_SCALE, point);
      return;
    }
    lastTapRef.current = { time, point };
    if (!onImage && viewRef.current.s <= 1.01) close();
  };

  // ── Pointer gestures ───────────────────────────────────────────────────────

  const beginGesture = (mode: Mode, point: Point, time: number, onImage: boolean): Gesture => ({
    mode,
    start: point,
    startTime: time,
    startView: viewRef.current,
    last: point,
    lastTime: time,
    velocity: { x: 0, y: 0 },
    pinchDistance: 1,
    pinchMid: point,
    onImage,
  });

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (closingRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as Element).closest("button, a")) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const pointers = pointersRef.current;
    const point = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, point);

    if (pointers.size === 1) {
      const onImage = (e.target as Element).tagName === "IMG";
      gestureRef.current = beginGesture(
        viewRef.current.s > 1.01 ? "pan" : "pending",
        point,
        e.timeStamp,
        onImage,
      );
      return;
    }

    if (pointers.size === 2) {
      const previous = gestureRef.current;
      if (previous?.mode === "swipe") applyTrack(0, SETTLE_MS);
      if (previous?.mode === "dismiss") applyPresence(1, SETTLE_MS);
      const [a, b] = [...pointers.values()];
      const mid = midpoint(a, b);
      gestureRef.current = {
        ...beginGesture("pinch", mid, e.timeStamp, true),
        pinchDistance: Math.max(1, distance(a, b)),
        pinchMid: mid,
      };
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    const point = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, point);
    const g = gestureRef.current;
    if (!g) return;

    if (g.mode === "pinch") {
      if (pointers.size < 2) return;
      const [a, b] = [...pointers.values()];
      const mid = midpoint(a, b);
      const raw = g.startView.s * (distance(a, b) / g.pinchDistance);
      const s = rubberBand(raw, 1, MAX_SCALE);
      const zoomed = zoomAround(g.startView, g.pinchMid, s);
      applyView({ s, x: zoomed.x + mid.x - g.pinchMid.x, y: zoomed.y + mid.y - g.pinchMid.y });
      return;
    }

    const dt = Math.max(1, e.timeStamp - g.lastTime);
    g.velocity = { x: (point.x - g.last.x) / dt, y: (point.y - g.last.y) / dt };
    g.last = point;
    g.lastTime = e.timeStamp;
    const dx = point.x - g.start.x;
    const dy = point.y - g.start.y;

    if (g.mode === "pending") {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      g.mode = Math.abs(dx) > Math.abs(dy) ? "swipe" : dy > 0 ? "dismiss" : "ignore";
    }

    if (g.mode === "pan") {
      const limit = panLimits(g.startView.s);
      applyView({
        s: g.startView.s,
        x: rubberBand(g.startView.x + dx, -limit.x, limit.x),
        y: rubberBand(g.startView.y + dy, -limit.y, limit.y),
      });
    } else if (g.mode === "swipe") {
      const atEdge =
        (dx > 0 && indexRef.current === 0) || (dx < 0 && indexRef.current === count - 1);
      applyTrack(atEdge ? dx * EDGE_RESISTANCE : dx);
    } else if (g.mode === "dismiss") {
      const pull = Math.max(0, dy);
      writeImage(
        `translate3d(${dx * 0.5}px, ${pull}px, 0) scale(${1 - Math.min(pull, 400) / 1600})`,
        0,
      );
      applyPresence(1 - Math.min(pull / 480, 0.85));
    }
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.delete(e.pointerId)) return;
    const g = gestureRef.current;
    if (!g) return;

    if (g.mode === "pinch") {
      if (pointers.size === 1) {
        // One finger lifted: keep going as a pan with the finger that stayed.
        const [rest] = [...pointers.values()];
        gestureRef.current = beginGesture("pan", rest, e.timeStamp, true);
      } else if (pointers.size === 0) {
        gestureRef.current = null;
        settle(viewRef.current);
      }
      return;
    }
    if (pointers.size > 0) return;
    gestureRef.current = null;

    const cancelled = e.type === "pointercancel";
    const point = { x: e.clientX, y: e.clientY };
    const dx = point.x - g.start.x;
    const dy = point.y - g.start.y;
    const velocity = e.timeStamp - g.lastTime > VELOCITY_STALE_MS ? { x: 0, y: 0 } : g.velocity;
    const isTap =
      !cancelled && Math.hypot(dx, dy) < TAP_SLOP_PX && e.timeStamp - g.startTime < TAP_MAX_MS;

    switch (g.mode) {
      case "pending":
      case "pan":
        if (isTap) handleTap(point, e.timeStamp, g.onImage);
        if (g.mode === "pan") settle(viewRef.current);
        return;
      case "swipe": {
        const width = stageRef.current?.clientWidth ?? 1;
        const threshold = width * SWIPE_DISTANCE_RATIO;
        if (!cancelled && (dx < -threshold || velocity.x < -SWIPE_VELOCITY)) {
          goTo(indexRef.current + 1);
        } else if (!cancelled && (dx > threshold || velocity.x > SWIPE_VELOCITY)) {
          goTo(indexRef.current - 1);
        } else {
          applyTrack(0, SETTLE_MS);
        }
        return;
      }
      case "dismiss":
        if (!cancelled && (dy > DISMISS_DISTANCE_PX || velocity.y > DISMISS_VELOCITY)) {
          close();
        } else {
          applyView(viewRef.current, SETTLE_MS);
          applyPresence(1, SETTLE_MS);
        }
        return;
      default:
        return;
    }
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    applyTrack(0);
    // Mount only: later index changes position the track inside `goTo`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Native modal: the page behind becomes inert and focus stays inside the dialog.
    const dialog = rootRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    closeButtonRef.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => setEntered(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (dialog?.open) dialog.close();
      clearRemoteImageInfoCache();
    };
  }, []);

  const onWindowKey = useEffectEvent((e: KeyboardEvent) => {
    if (closingRef.current) return;
    // Leave browser shortcuts (page zoom, DevTools, history) alone.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowRight":
        e.preventDefault();
        goTo(indexRef.current + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        goTo(indexRef.current - 1);
        break;
      case "+":
      case "=":
        zoomTo(viewRef.current.s * 1.5);
        break;
      case "-":
        zoomTo(viewRef.current.s / 1.5);
        break;
      case "i":
      case "I":
        setSpecsOpen((open) => !open);
        break;
      case "0":
        resetZoom();
        break;
      default:
    }
  });

  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault();
    const view = viewRef.current;
    if (e.ctrlKey || e.metaKey) {
      // Trackpad pinch arrives as ctrl + wheel.
      // Mouse wheels report ~100 per notch (or lines); cap it so one notch is ~1.3×, not 2.7×.
      const delta = clamp(e.deltaY * (e.deltaMode === 1 ? 16 : 1), -25, 25);
      const s = clamp(view.s * Math.exp(-delta * 0.01), 1, MAX_SCALE);
      settle(zoomAround(view, { x: e.clientX, y: e.clientY }, s), 0);
    } else if (view.s > 1.01) {
      applyView(clampView({ ...view, x: view.x - e.deltaX, y: view.y - e.deltaY }));
    }
  });

  const onResize = useEffectEvent(() => settle(viewRef.current, 0));

  /** Esc / Android back: run the exit animation instead of the browser's instant close. */
  const onCancel = useEffectEvent((e: Event) => {
    e.preventDefault();
    close();
  });

  useEffect(() => {
    const stage = stageRef.current;
    const dialog = rootRef.current;
    window.addEventListener("keydown", onWindowKey);
    const observer = new ResizeObserver(() => onResize());
    if (stage) observer.observe(stage);
    stage?.addEventListener("wheel", onWheel, { passive: false });
    dialog?.addEventListener("cancel", onCancel);
    return () => {
      window.removeEventListener("keydown", onWindowKey);
      observer.disconnect();
      stage?.removeEventListener("wheel", onWheel);
      dialog?.removeEventListener("cancel", onCancel);
    };
  }, []);

  const visible = entered && !closing;
  const zoomed = zoomPercent > 100;
  const chromeStyle = { opacity: "var(--lightbox-chrome, 1)" } as CSSProperties;

  return createPortal(
    <dialog
      ref={rootRef}
      aria-label={labels.dialog}
      className={cn(
        "text-primary fixed inset-0 m-0 flex size-full max-h-none max-w-none flex-col overscroll-contain border-0 bg-transparent p-0 transition-opacity duration-200 ease-out backdrop:bg-transparent motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        ref={backdropRef}
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] backdrop-blur-xl backdrop-saturate-150"
      />

      {/* Top bar */}
      <div
        className="relative z-10 flex items-center gap-3 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 transition-opacity duration-200 sm:px-5"
        style={chromeStyle}
      >
        <span className="text-review shrink-0 font-mono text-[11px] tracking-wider tabular-nums">
          {pad2(index + 1)}
          <span className="text-muted"> / {pad2(count)}</span>
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="font-display text-primary truncate text-sm font-semibold tracking-tight">
            {current.title}
          </p>
          <p className="text-muted truncate font-mono text-[10px] tracking-wide sm:text-[11px]">
            {current.subtitle}
          </p>
        </div>
        <button
          type="button"
          className={cn(iconButton, specsOpen && "border-review/55 text-review")}
          aria-label={labels.specs}
          aria-pressed={specsOpen}
          title={labels.specs}
          onClick={() => setSpecsOpen((open) => !open)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden {...ICON}>
            <circle cx="12" cy="12" r="8.25" />
            <path d="M12 11v5.5" />
            <path d="M12 7.5v.5" />
          </svg>
        </button>
        <button
          type="button"
          className={cn(iconButton, "hidden pointer-fine:inline-flex")}
          aria-label={zoomed ? labels.resetZoom : labels.zoomIn}
          aria-pressed={zoomed}
          onClick={() => (zoomed ? resetZoom() : zoomTo(DOUBLE_TAP_SCALE))}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden {...ICON}>
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="M15 15l5 5" />
            <path d="M8 10.5h5" />
            {zoomed ? null : <path d="M10.5 8v5" />}
          </svg>
        </button>
        <a
          href={current.src}
          target="_blank"
          rel="noopener noreferrer"
          className={iconButton}
          aria-label={labels.openOriginal}
          title={labels.openOriginal}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden {...ICON}>
            <path d="M14 5h5v5" />
            <path d="M19 5l-8 8" />
            <path d="M17 13.5V19H5V7h5.5" />
          </svg>
        </a>
        <button
          ref={closeButtonRef}
          type="button"
          className={iconButton}
          aria-label={labels.close}
          onClick={close}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden {...ICON}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Stage + specs */}
      <div className="relative flex min-h-0 flex-1">
        <div
          ref={stageRef}
          className={cn(
            "relative min-w-0 flex-1 touch-none overflow-hidden select-none",
            zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <div
            className={cn(
              "h-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              visible ? "scale-100" : "scale-[0.96]",
            )}
          >
            <div ref={trackRef} className="flex h-full will-change-transform">
              {items.map((item, i) => (
                <div
                  key={item.key}
                  className="relative flex h-full w-full shrink-0 items-center justify-center px-3 pb-2 sm:px-20"
                  aria-hidden={i !== index}
                >
                  {Math.abs(i - index) <= 1 ? (
                    <>
                      {/* oxlint-disable-next-line nextjs/no-img-element -- full-resolution original, zoomed up to 4× */}
                      <img
                        ref={(el) => {
                          if (el) imageRefs.current.set(i, el);
                          else imageRefs.current.delete(i);
                        }}
                        src={item.src}
                        alt={item.alt}
                        width={item.width}
                        height={item.height}
                        draggable={false}
                        decoding="async"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          img.dataset.loaded = "true";
                          setNaturalSizes((sizes) =>
                            sizes[item.key]
                              ? sizes
                              : {
                                  ...sizes,
                                  [item.key]: {
                                    width: img.naturalWidth,
                                    height: img.naturalHeight,
                                  },
                                },
                          );
                        }}
                        className={cn(
                          "peer max-h-full w-auto max-w-full rounded-sm object-contain opacity-0 shadow-[0_24px_80px_-24px_rgb(0_0_0/0.55)] select-none data-[loaded=true]:opacity-100",
                          zoomed ? "" : "cursor-zoom-in",
                        )}
                        style={{ height: "auto", transformOrigin: "center" }}
                      />
                      <span
                        aria-hidden
                        className="border-edge border-t-review pointer-events-none absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 transition-opacity peer-data-[loaded=true]:opacity-0 motion-reduce:animate-none"
                      />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={cn(
              iconButton,
              "absolute top-1/2 left-4 z-10 hidden -translate-y-1/2 pointer-fine:inline-flex",
            )}
            aria-label={labels.prev}
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            style={chromeStyle}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden {...ICON}>
              <path d="M14.5 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            className={cn(
              iconButton,
              "absolute top-1/2 right-4 z-10 hidden -translate-y-1/2 pointer-fine:inline-flex",
            )}
            aria-label={labels.next}
            disabled={index === count - 1}
            onClick={() => goTo(index + 1)}
            style={chromeStyle}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden {...ICON}>
              <path d="M9.5 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {specsOpen ? (
          <ReviewSpecsPanel
            target={{
              src: current.src,
              // Key art has no fixed target size, only a 16:9 convention.
              expectedWidth: current.kind === "web" ? null : current.width,
              expectedHeight: current.kind === "web" ? null : current.height,
              kind: current.kind,
              natural: naturalSizes[current.key] ?? null,
            }}
            onClose={() => setSpecsOpen(false)}
            style={chromeStyle}
            className="border-edge/60 bg-surface/92 lg:bg-surface/55 absolute inset-x-2 bottom-2 z-20 max-h-[58%] overflow-y-auto overscroll-contain rounded-sm border shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)] backdrop-blur-xl transition-opacity duration-200 lg:static lg:z-auto lg:max-h-none lg:w-80 lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l lg:shadow-none xl:w-[22rem]"
          />
        ) : null}
      </div>

      {/* Bottom bar */}
      <div
        className="relative z-10 flex min-h-[4.5rem] flex-col items-center justify-center gap-2.5 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.875rem)] transition-opacity duration-200"
        style={chromeStyle}
      >
        {zoomed ? (
          <button
            type="button"
            onClick={resetZoom}
            className="bg-review/10 text-review border-review/35 hover:bg-review/15 focus-visible:ring-review/60 inline-flex min-h-8 items-center gap-2 rounded-sm border px-3 font-mono text-[11px] tracking-wide tabular-nums transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <span>{zoomPercent} %</span>
            <span aria-hidden className="bg-review/40 h-3 w-px" />
            <span>{labels.resetZoom}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            {items.map((item, i) => (
              <button
                key={item.key}
                type="button"
                aria-label={item.goToLabel}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
                className="group flex h-8 items-center justify-center px-1 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "group-focus-visible:ring-review/60 block h-1.5 rounded-full transition-[width,background-color] duration-300 group-focus-visible:ring-2 motion-reduce:transition-none",
                    i === index ? "bg-review w-5" : "bg-primary/25 group-hover:bg-primary/45 w-1.5",
                  )}
                />
              </button>
            ))}
          </div>
        )}
        <p className="text-muted hidden text-center font-mono text-[10px] tracking-wide pointer-coarse:block">
          {labels.hintTouch}
        </p>
        <p className="text-muted hidden text-center font-mono text-[10px] tracking-wide pointer-fine:block">
          {labels.hintPointer}
        </p>
      </div>
    </dialog>,
    document.body,
  );
}
