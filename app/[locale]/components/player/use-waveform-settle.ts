"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface WaveformSettleOptions {
  /** Must match the bars' idle `transform` in CSS so the hand-off after cleanup is invisible. */
  settleScale?: string;
  /** Must match the bars' idle `opacity` in CSS. */
  settleOpacity?: number;
  settleTransition?: string;
  cleanupMs?: number;
}

const DEFAULT_TRANSITION = "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease 0.06s";

/**
 * Only these are touched — bars keep their own inline height, flex, background and CSS vars.
 * `animation` is deliberately left to the stylesheet so play always restarts it cleanly.
 */
const SETTLE_PROPS = ["transform", "transition", "opacity"] as const;

function clearBarStyles(bar: HTMLElement) {
  for (const prop of SETTLE_PROPS) bar.style.removeProperty(prop);
}

function setBarStyles(
  bar: HTMLElement,
  styles: Partial<Record<(typeof SETTLE_PROPS)[number], string>>,
) {
  for (const [prop, value] of Object.entries(styles)) bar.style.setProperty(prop, value);
}

/**
 * Freezes playing waveform bars mid-motion on pause and eases them into their idle pose.
 *
 * The returned flag drives the "playing" attribute. On pause it stays set through the layout
 * effect, so the live animation frame can be captured as an inline transform before the
 * attribute (and with it the CSS animation) is dropped in the same pre-paint render.
 */
export function useWaveformSettle(
  isPlaying: boolean,
  getBars: () => HTMLElement[],
  {
    settleScale = "scaleY(0.1)",
    settleOpacity = 0.32,
    settleTransition = DEFAULT_TRANSITION,
    cleanupMs = 1300,
  }: WaveformSettleOptions = {},
): boolean {
  const [visualPlaying, setVisualPlaying] = useState(isPlaying);
  if (isPlaying && !visualPlaying) setVisualPlaying(true);

  // Call sites pass inline closures; keep the latest without re-running (and cancelling) the settle.
  const getBarsRef = useRef(getBars);
  useLayoutEffect(() => {
    getBarsRef.current = getBars;
  });

  const wasPlayingRef = useRef(isPlaying);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;

    const cancelPending = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const cleanup = () => {
      cancelled = true;
      cancelPending();
    };

    cancelPending();
    const bars = getBarsRef.current();

    if (isPlaying) {
      wasPlayingRef.current = true;
      bars.forEach(clearBarStyles);
      return cleanup;
    }

    if (!wasPlayingRef.current) return cleanup;
    wasPlayingRef.current = false;

    // The playing attribute is still set here, so computed styles reflect the live animation frame.
    const frozen = bars.map((bar) => {
      const computed = getComputedStyle(bar);
      return { bar, transform: computed.transform, opacity: computed.opacity };
    });
    for (const { bar, transform, opacity } of frozen) {
      setBarStyles(bar, { transform, transition: "none", opacity });
    }
    // Layout-effect updates re-render before paint: the animation stops on the frozen frame.
    setVisualPlaying(false);

    if (bars.length === 0) return cleanup;

    rafRef.current = requestAnimationFrame(() => {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (cancelled) return;
        for (const bar of bars) {
          setBarStyles(bar, {
            transition: settleTransition,
            transform: settleScale,
            opacity: String(settleOpacity),
          });
        }
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (cancelled) return;
          bars.forEach(clearBarStyles);
        }, cleanupMs);
      });
    });

    return cleanup;
  }, [isPlaying, settleTransition, settleScale, settleOpacity, cleanupMs]);

  return isPlaying || visualPlaying;
}
