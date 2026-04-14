"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface WaveformSettleOptions {
  frozenOpacity?: number;
  settleScale?: string;
  settleOpacity?: number;
  settleTransition?: string;
  cleanupMs?: number;
}

const DEFAULT_TRANSITION =
  "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease 0.06s";

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
  const [cssWaveHold, setCssWaveHold] = useState(isPlaying);
  const getBarsRef = useRef(getBars);
  getBarsRef.current = getBars;

  const wasPlayingRef = useRef(isPlaying);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStyles = useCallback((bar: HTMLElement) => {
    bar.style.animation = "";
    bar.style.transform = "";
    bar.style.transition = "";
    bar.style.opacity = "";
  }, []);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    cancel();
    const bars = getBarsRef.current();

    if (isPlaying) {
      wasPlayingRef.current = true;
      setCssWaveHold(true);
      bars.forEach(clearStyles);
      return cancel;
    }

    if (!wasPlayingRef.current) {
      setCssWaveHold(false);
      return cancel;
    }
    wasPlayingRef.current = false;

    if (bars.length === 0) {
      setCssWaveHold(false);
      return cancel;
    }

    bars.forEach((bar) => {
      const frozenTransform = getComputedStyle(bar).transform;
      bar.style.animation = "none";
      bar.style.transform = frozenTransform;
      bar.style.transition = "none";
      bar.style.opacity = String(frozenOpacity);
    });

    setCssWaveHold(false);

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        bars.forEach((bar) => {
          bar.style.transition = settleTransition;
          bar.style.transform = settleScale;
          bar.style.opacity = String(settleOpacity);
        });
        timerRef.current = setTimeout(() => {
          bars.forEach(clearStyles);
          timerRef.current = null;
        }, cleanupMs);
      });
    });

    return cancel;
  }, [isPlaying, frozenOpacity, settleTransition, settleScale, settleOpacity, cleanupMs, cancel, clearStyles]);

  return isPlaying || cssWaveHold;
}
