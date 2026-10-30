"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import { cn } from "@/lib/ui/cn";

export interface KitTocEntry {
  id: string;
  label: string;
  /** Label for the phone chip bar, where a bare sub-type ("Story") would be ambiguous. */
  chipLabel?: string;
  children?: KitTocEntry[];
}

interface EpisodeKitTocProps {
  /** `bar`: sticky swipeable chips for phones and tablets. `rail`: sticky sidebar on desktop. */
  variant: "bar" | "rail";
  entries: KitTocEntry[];
  heading: string;
  ariaLabel: string;
}

/** Below the fixed navbar (64px) plus the mobile chip bar; a target above this line is "passed". */
const ACTIVE_LINE_PX = 160;

function flatten(entries: KitTocEntry[]): KitTocEntry[] {
  return entries.flatMap((entry) => [entry, ...flatten(entry.children ?? [])]);
}

/** id → ids of every entry above it, so a section can light up its network and "Artwork". */
function ancestorsById(
  entries: KitTocEntry[],
  parents: string[] = [],
  out = new Map<string, string[]>(),
) {
  for (const entry of entries) {
    out.set(entry.id, parents);
    ancestorsById(entry.children ?? [], [...parents, entry.id], out);
  }
  return out;
}

/** Keep an entry when its target exists or when any descendant is still on the page. */
function pruneUnavailable(entries: KitTocEntry[], available: ReadonlySet<string>): KitTocEntry[] {
  return entries.flatMap((entry) => {
    const children = pruneUnavailable(entry.children ?? [], available);
    if (!available.has(entry.id) && children.length === 0) return [];
    return [{ ...entry, children }];
  });
}

/** Rail typography per depth: section → network → sub-type. */
const RAIL_DEPTH = [
  "py-1.5 pl-4 font-mono text-[11px] tracking-[0.12em] uppercase",
  "py-1 pl-7 text-[13px] leading-snug",
  "py-0.5 pl-10 font-mono text-[10px] tracking-[0.14em] uppercase",
] as const;

/**
 * Jump list for the share kit: a sticky sidebar on desktop, a swipeable chip bar on phones.
 * Image groups can vanish client-side (frames not uploaded), so entries track what is in the DOM.
 */
export function EpisodeKitToc({ variant, entries, heading, ariaLabel }: EpisodeKitTocProps) {
  const all = flatten(entries);
  const [available, setAvailable] = useState<ReadonlySet<string>>(
    () => new Set(all.map((e) => e.id)),
  );
  const [active, setActive] = useState(all[0]?.id ?? "");
  const chipBarRef = useRef<HTMLDivElement>(null);
  const idsKey = all.map((e) => e.id).join("|");

  useEffect(() => {
    const ids = idsKey.split("|");
    const syncAvailable = () => {
      const present = ids.filter((id) => document.getElementById(id));
      setAvailable((prev) =>
        prev.size === present.length && present.every((id) => prev.has(id))
          ? prev
          : new Set(present),
      );
    };
    syncAvailable();
    const observer = new MutationObserver(syncAvailable);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [idsKey]);

  useEffect(() => {
    const ids = idsKey.split("|").filter((id) => available.has(id));
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_LINE_PX) current = id;
      }
      if (atBottom && ids.length > 0) current = ids[ids.length - 1];
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [idsKey, available]);

  // Keep the active chip visible in the phone bar without moving the page.
  useEffect(() => {
    const bar = chipBarRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-toc-id="${active}"]`);
    if (!bar || !chip) return;
    const left = chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2;
    bar.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  const jump = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  const visibleEntries = pruneUnavailable(entries, available);
  const activeAncestors = new Set(ancestorsById(entries).get(active) ?? []);

  if (variant === "bar") {
    return (
      <div className="bg-bg/90 border-edge -mx-4 border-y backdrop-blur-md sm:-mx-5">
        <nav aria-label={ariaLabel}>
          <div
            ref={chipBarRef}
            className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-2 sm:px-5 [&::-webkit-scrollbar]:hidden"
          >
            {flatten(visibleEntries)
              .filter((entry) => available.has(entry.id))
              .map((entry) => {
                const isActive = entry.id === active;
                return (
                  <a
                    key={entry.id}
                    href={`#${entry.id}`}
                    data-toc-id={entry.id}
                    onClick={(e) => jump(e, entry.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      "inline-flex min-h-9 shrink-0 items-center rounded-sm border px-3 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap uppercase transition-colors",
                      isActive
                        ? "border-accent text-primary bg-accent/10"
                        : activeAncestors.has(entry.id)
                          ? "border-edge text-primary"
                          : "border-edge text-muted hover:text-primary",
                    )}
                  >
                    {entry.chipLabel ?? entry.label}
                  </a>
                );
              })}
          </div>
        </nav>
      </div>
    );
  }

  const renderRail = (list: KitTocEntry[], depth: number) => (
    <ul className={depth > 0 ? "mb-1" : "border-edge border-l"}>
      {list.map((entry) => {
        const isActive = entry.id === active;
        return (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={(e) => jump(e, entry.id)}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "-ml-px block border-l transition-colors",
                RAIL_DEPTH[Math.min(depth, RAIL_DEPTH.length - 1)],
                isActive
                  ? "border-accent text-primary"
                  : activeAncestors.has(entry.id)
                    ? "text-primary border-transparent"
                    : "text-muted hover:text-primary border-transparent",
              )}
            >
              {entry.label}
            </a>
            {entry.children && entry.children.length > 0
              ? renderRail(entry.children, depth + 1)
              : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-28 max-h-[calc(100vh-8rem)] [scrollbar-width:thin] overflow-y-auto overscroll-contain pb-4"
    >
      <p className="text-muted mb-3 font-mono text-[10px] tracking-[0.18em] uppercase">{heading}</p>
      {renderRail(visibleEntries, 0)}
    </nav>
  );
}
