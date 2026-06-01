"use client";

import { useEffect, useRef, type RefObject } from "react";

import type { Episode } from "@/lib/episode/catalog";
import { useLatestRef } from "@/lib/react/use-latest-ref";

const KEYBOARD_SKIP_SEC = 15;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const { type } = el as HTMLInputElement;
  return type !== "button" && type !== "submit" && type !== "checkbox" && type !== "radio";
}

function shortcutConsumingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(
    el.closest(
      "button, a[href], [role='slider'], input, textarea, select, [contenteditable='true']",
    ),
  );
}

export function useGlobalPlayerKeyboardShortcuts(
  episodeRef: RefObject<Episode | null>,
  togglePlay: () => void,
  skip: (deltaSecs: number) => void,
  cycleRate: () => void,
) {
  const togglePlayRef = useLatestRef(togglePlay);
  const skipRef = useLatestRef(skip);
  const cycleRateRef = useLatestRef(cycleRate);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (isTypingTarget(e.target)) return;
      if (!episodeRef.current) return;

      if (e.code === "Space" || e.key === " " || e.key === "k" || e.key === "K") {
        if (shortcutConsumingTarget(e.target)) return;
        e.preventDefault();
        togglePlayRef.current();
        return;
      }
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        skipRef.current(e.code === "ArrowLeft" ? -KEYBOARD_SKIP_SEC : KEYBOARD_SKIP_SEC);
        return;
      }
      if ((e.key === "," || e.key === ".") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        cycleRateRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [episodeRef, togglePlayRef, skipRef, cycleRateRef]);
}
