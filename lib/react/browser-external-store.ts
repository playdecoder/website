"use client";

import { type RefObject, useRef, useSyncExternalStore } from "react";

const HERO_WAVE_INTERSECTION: IntersectionObserverInit = {
  root: null,
  rootMargin: "96px 0px 96px 0px",
  threshold: 0,
};

function subscribeDocumentTabVisible(onStoreChange: () => void) {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}

function getDocumentTabVisibleSnapshot() {
  return document.visibilityState !== "hidden";
}

function getDocumentTabVisibleServerSnapshot() {
  return true;
}

export function useDocumentTabVisible() {
  return useSyncExternalStore(
    subscribeDocumentTabVisible,
    getDocumentTabVisibleSnapshot,
    getDocumentTabVisibleServerSnapshot,
  );
}

function subscribeHtmlDarkClass(onStoreChange: () => void) {
  const root = document.documentElement;
  const obs = new MutationObserver(onStoreChange);
  obs.observe(root, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function getHtmlDarkClassSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getHtmlDarkClassServerSnapshot() {
  return false;
}

export function useHtmlDarkClass() {
  return useSyncExternalStore(
    subscribeHtmlDarkClass,
    getHtmlDarkClassSnapshot,
    getHtmlDarkClassServerSnapshot,
  );
}

export type HeroWaveformEffect = "osc" | "bars";

function subscribeHeroWaveformEffect(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHeroWaveformEffectSnapshot(): HeroWaveformEffect {
  return window.location.hash.includes("hero-effect=bars") ? "bars" : "osc";
}

function getHeroWaveformEffectServerSnapshot(): HeroWaveformEffect {
  return "osc";
}

export function useHeroWaveformEffect(): HeroWaveformEffect {
  return useSyncExternalStore(
    subscribeHeroWaveformEffect,
    getHeroWaveformEffectSnapshot,
    getHeroWaveformEffectServerSnapshot,
  );
}

export function useHeroWaveInView(targetRef: RefObject<Element | null>): boolean {
  const inViewRef = useRef(true);

  return useSyncExternalStore(
    (onStoreChange) => {
      const el = targetRef.current;
      if (!el || typeof IntersectionObserver === "undefined") {
        return () => {};
      }
      inViewRef.current = true;
      const io = new IntersectionObserver(([entry]) => {
        const next = entry.isIntersecting;
        if (inViewRef.current !== next) {
          inViewRef.current = next;
          onStoreChange();
        }
      }, HERO_WAVE_INTERSECTION);
      io.observe(el);
      return () => io.disconnect();
    },
    () => inViewRef.current,
    () => true,
  );
}
