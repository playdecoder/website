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
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`}
        style={{ animation: "pulseDot 2s ease-in-out infinite" }}
      />
      <span className="text-muted font-mono text-xs tracking-[0.25em] uppercase">{label}</span>
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`}
        style={{ animation: "pulseDot 2s ease-in-out infinite 0.5s" }}
      />
    </div>
  );
}
