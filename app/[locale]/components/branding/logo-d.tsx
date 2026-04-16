import { cn } from "@/lib/cn";

/** Tight viewBox (y 55→265): full `0 0 181 287` left empty space below the ink, so baseline alignment sat the box on the text baseline while the D floated above. */
const VIEWBOX = "0 55 181 210" as const;
const VIEWBOX_W = 181;
const VIEWBOX_H = 210;

const logoDLayoutHero = {
  display: "inline-block",
  height: "1cap",
  width: `calc(1cap * ${VIEWBOX_W} / ${VIEWBOX_H})`,
  verticalAlign: "baseline",
  overflow: "visible",
} as const;

const dPath =
  "M155.4 217.6C155.4 234.8 151.4 247 143.4 254.2C135.6 261.4 122.6 265 104.4 265H42.6V55H100.8C118.8 55 132.4 58.7 141.6 66.1C150.8 73.3 155.4 85.2 155.4 101.8V217.6ZM129.3 99.1C129.3 92.5 127.3 87.3 123.3 83.5C119.3 79.5 114 77.5 107.4 77.5H68.7V242.5H107.1C114.7 242.5 120.3 240.8 123.9 237.4C127.5 233.8 129.3 228.2 129.3 220.6V99.1Z";

export type LogoDVariant = "hero" | "footer";

export interface LogoDProps {
  variant?: LogoDVariant;
  className?: string;
}

/** Inline SVG: geometry and palette from `public/logo/d.svg` + `d-dark.svg` (`1cap` unreliable on `<img>`). */
export function LogoD({ variant = "hero", className }: LogoDProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEWBOX}
      fill="none"
      aria-hidden
      focusable="false"
      className={cn(
        variant === "footer" &&
          "inline-block h-7 w-[calc(1.75rem*181/210)] shrink-0 self-center overflow-visible",
        className
      )}
      style={variant === "hero" ? logoDLayoutHero : undefined}
    >
      <rect
        x="23"
        y="55"
        width="14"
        height="210"
        className="fill-black dark:fill-white"
      />
      <rect
        y="55"
        width="17"
        height="210"
        className="fill-[#3126FF] dark:fill-[#D4FF3F]"
      />
      <rect
        x="55"
        y="70"
        width="78"
        height="185"
        className="fill-[#D4FF3F] dark:fill-[#3126FF]"
      />
      <path d={dPath} className="fill-black dark:fill-white" />
    </svg>
  );
}
