import { cn } from "@/lib/cn";

interface PlayGlyphIconProps {
  className?: string;
  size?: number;
}

export function PlayGlyphIcon({ className, size = 16 }: PlayGlyphIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("shrink-0 translate-x-px", className)}
    >
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
