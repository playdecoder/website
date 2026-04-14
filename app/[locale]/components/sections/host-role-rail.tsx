import { cn } from "@/lib/cn";

import { BarMotif } from "../ui/bar-motif";

interface HostRoleRailProps {
  variant: "secondary" | "accent";
  primary: string;
  secondary: string;
  className?: string;
}

export function HostRoleRail({ variant, primary, secondary, className }: HostRoleRailProps) {
  const accent = variant === "accent";

  return (
    <div className={cn("flex items-end gap-3 min-w-0", className)}>
      <div
        className={cn(
          "flex flex-col gap-1 pl-3 min-w-0 border-l-2",
          accent ? "border-accent/50" : "border-secondary/50",
        )}
      >
        <span
          className={cn(
            "font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.16em] leading-snug",
            accent ? "text-accent-text" : "text-secondary",
          )}
        >
          {primary}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] sm:tracking-[0.14em] leading-snug",
            accent ? "text-accent-text/78" : "text-secondary/82",
          )}
        >
          {secondary}
        </span>
      </div>
      <BarMotif size={0.55} />
    </div>
  );
}
