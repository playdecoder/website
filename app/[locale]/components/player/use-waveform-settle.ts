"use client";

import { useLayoutEffect, useRef } from "react";

interface WaveformSettleOptions {
  frozenOpacity?: number;
  settleScale?: string;
  settleOpacity?: number;
  settleTransition?: string;
  cleanupMs?: number;
}

const DEFAULT_TRANSITION = "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease 0.06s";

function clearBarStyles(bar: HTMLElement) {
  bar.style.removeProperty("animation");
  bar.style.removeProperty("transform");
  bar.style.removeProperty("transition");
  bar.style.removeProperty("opacity");
}

export function useWaveformSettle(
  isPlaying: boolean,
  getBars: () => HTMLElement[],
  {
    frozenOpacity = 0.88,
    settleScale = "scaleY(0.1)",
    settleOpacity = 0.32,
    settleTransition = DEFAULT_TRANSITION,
    cleanupMs = 1300,
  }: WaveformSettleOptions = {},
): boolean {
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

    cancelPending();
    const bars = getBars();

    if (isPlaying) {
      wasPlayingRef.current = true;
      bars.forEach(clearBarStyles);
      return () => {
        cancelled = true;
        cancelPending();
      };
    }

    if (!wasPlayingRef.current) {
      return () => {
        cancelled = true;
        cancelPending();
      };
    }
    wasPlayingRef.current = false;

    if (bars.length === 0) {
      return () => {
        cancelled = true;
        cancelPending();
      };
    }

    const frozen = bars.map((bar) => ({
      bar,
      transform: getComputedStyle(bar).transform,
    }));
    for (const { bar, transform } of frozen) {
      bar.style.cssText = `animation: none; transform: ${transform}; transition: none; opacity: ${String(frozenOpacity)}`;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (cancelled) return;
        for (const bar of bars) {
          bar.style.cssText = `transition: ${settleTransition}; transform: ${settleScale}; opacity: ${String(settleOpacity)}`;
        }
        timerRef.current = setTimeout(() => {
          if (cancelled) return;
          bars.forEach(clearBarStyles);
          timerRef.current = null;
        }, cleanupMs);
      });
    });

    return () => {
      cancelled = true;
      cancelPending();
    };
  }, [isPlaying, frozenOpacity, settleTransition, settleScale, settleOpacity, cleanupMs, getBars]);

  return isPlaying;
}
