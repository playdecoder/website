"use client";

import { useEffect } from "react";

/* Matches the `short` variant in globals.css: Duo outer display, phones in landscape. */
const SHORT_VIEWPORT_QUERY = "(height < 40rem)";
const SCROLL_DELTA_PX = 8;
/* Keep the bar pinned until the reader is clearly past the top of the page. */
const REVEAL_ZONE_PX = 96;

/**
 * On short viewports the fixed top bar slides away while scrolling down and returns on the
 * first scroll up, handing its height back to content (cf. iPhone Duo HIG: preserve vertical
 * space). Writes `data-nav-hidden` on <html>; the transform itself lives in globals.css.
 */
export function NavAutoHide() {
  useEffect(() => {
    const root = document.documentElement;
    const query = window.matchMedia(SHORT_VIEWPORT_QUERY);
    let lastY = window.scrollY;
    let frame = 0;

    const setHidden = (hidden: boolean) => {
      if (hidden) root.dataset.navHidden = "true";
      else delete root.dataset.navHidden;
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < REVEAL_ZONE_PX) {
        setHidden(false);
        lastY = y;
      } else if (Math.abs(delta) >= SCROLL_DELTA_PX) {
        setHidden(delta > 0);
        lastY = y;
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const sync = () => {
      window.removeEventListener("scroll", onScroll);
      setHidden(false);
      if (query.matches) {
        lastY = window.scrollY;
        window.addEventListener("scroll", onScroll, { passive: true });
      }
    };

    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      setHidden(false);
    };
  }, []);

  return null;
}
