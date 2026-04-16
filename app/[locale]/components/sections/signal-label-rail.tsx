"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

interface SignalLabelRailProps {
  label: string;
  dotClassName: string;
  className?: string;
  style?: CSSProperties;
}

export function SignalLabelRail({ label, dotClassName, className, style }: SignalLabelRailProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} style={style}>
      <span className={`ui-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} />
      <span className="text-muted font-mono text-xs tracking-[0.25em] uppercase">{label}</span>
      <span
        className={`ui-pulse-dot ui-pulse-dot--delay h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`}
      />
    </div>
  );
}
