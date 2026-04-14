import type { SVGProps } from "react";

import { cn } from "@/lib/cn";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height" | "children"> & {
  size?: number;
};

const strokeProps = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconEpisodeAirDate({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
      {...strokeProps}
      {...props}
    >
      <path d="M8 3.75V6M16 3.75V6" />
      <rect x="4" y="6" width="16" height="14.25" rx="1.5" />
      <line x1="7" y1="10.25" x2="17" y2="10.25" />
      <path d="M9 18V15M12 18v-4.5M15 18v-2.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function IconLatestDrop({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="6.35" r="1.35" fill="currentColor" stroke="none" />
      <path d="M6.35 10.65 Q12 15.1 17.65 10.65" {...strokeProps} />
      <path d="M4.4 14.05 Q12 20.15 19.6 14.05" {...strokeProps} />
      <path d="M2.75 17.35 Q12 22.4 21.25 17.35" {...strokeProps} />
    </svg>
  );
}

export function IconEpisodeDuration({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
      {...strokeProps}
      {...props}
    >
      <circle cx="12" cy="12" r="7.75" />
      <path d="M12 7.25V12h4.25" strokeLinecap="square" strokeLinejoin="miter" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconExternalLink({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
      {...strokeProps}
      {...props}
    >
      <path d="M14.25 4.75H19.25V9.75" />
      <path d="M10.5 13.5 19.2 4.8" />
      <path d="M18.25 12.75v5.5a2 2 0 0 1-2 2h-10.5a2 2 0 0 1-2-2v-10.5a2 2 0 0 1 2-2h5.5" />
    </svg>
  );
}

export function IconShare({ size = 14, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
      {...strokeProps}
      {...props}
    >
      <circle cx="18" cy="5.25" r="2.25" />
      <circle cx="6" cy="12" r="2.25" />
      <circle cx="18" cy="18.75" r="2.25" />
      <path d="M8.1 10.9 15.9 6.6M8.1 13.1 15.9 17.4" />
    </svg>
  );
}

export const icons = {
  episodeAirDate: IconEpisodeAirDate,
  episodeDuration: IconEpisodeDuration,
  latestDrop: IconLatestDrop,
  externalLink: IconExternalLink,
  share: IconShare,
} as const;

export type IconId = keyof typeof icons;
