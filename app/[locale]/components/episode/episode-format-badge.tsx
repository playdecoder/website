import type { EpisodeFormat } from "@/lib/episode/format";

interface EpisodeFormatBadgeProps {
  format: EpisodeFormat;
  label: string;
  /** Compact sizing for dense lists and card overlays. */
  size?: "default" | "compact";
  className?: string;
}

export function EpisodeFormatBadge({
  format,
  label,
  size = "default",
  className = "",
}: EpisodeFormatBadgeProps) {
  const sizeClass =
    size === "compact"
      ? "px-[5px] py-0.5 text-[0.58rem] tracking-[0.08em]"
      : "px-2 py-0.5 text-[10px] tracking-widest";

  return (
    <span
      className={`episode-format-badge episode-format-badge--${format} inline-flex shrink-0 items-center rounded-[3px] border font-mono font-medium uppercase ${sizeClass}${className ? ` ${className}` : ""}`}
    >
      {label}
    </span>
  );
}
