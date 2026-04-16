import { cn } from "@/lib/cn";

const VIEWBOX = "23.4 83.6 203.7 194.4" as const;
const VIEWBOX_W = 203.7;
const VIEWBOX_H = 194.4;

const logoDLayoutHero = {
  display: "inline-block",
  height: "1cap",
  width: `calc(1cap * ${VIEWBOX_W} / ${VIEWBOX_H})`,
  verticalAlign: "baseline",
  overflow: "visible",
} as const;

const dPathV4 =
  "M116.7 83.6C137.7 83.6 155.3 86.2 169.5 91.4C183.7 96.6 195 103.7 203.4 112.7C211.8 121.5 217.8 131.7 221.4 143.3C225.2 154.9 227.1 167.1 227.1 179.9C227.1 192.9 225.1 205.3 221.1 217.1C217.1 228.9 210.7 239.4 201.9 248.6C193.3 257.6 182 264.8 168 270.2C154 275.4 136.9 278 116.7 278H23.4V83.6H116.7ZM57.6 248H116.4C131.2 248 143.5 246.1 153.3 242.3C163.1 238.5 170.9 233.4 176.7 227C182.5 220.4 186.6 213.1 189 205.1C191.4 196.9 192.6 188.5 192.6 179.9C192.6 171.3 191.4 163.1 189 155.3C186.6 147.3 182.5 140.2 176.7 134C170.9 127.6 163.1 122.6 153.3 119C143.5 115.2 131.2 113.3 116.4 113.3H57.6V248Z";

export type LogoDVariant = "hero" | "footer";

export interface LogoDProps {
  variant?: LogoDVariant;
  className?: string;
}

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
          "inline-block h-7 w-[calc(1.75rem*203.7/194.4)] shrink-0 self-center overflow-visible",
        className
      )}
      style={variant === "hero" ? logoDLayoutHero : undefined}
    >
      <rect
        x="31.0918"
        y="98.0791"
        width="163"
        height="153"
        rx="23"
        fill="#D4FF3F"
      />
      <rect x="67.0918" y="108.079" width="26" height="143" fill="#5B4DFF" />
      <rect x="109.092" y="108.079" width="17" height="143" fill="#5B4DFF" />
      <rect x="142.092" y="108.079" width="29" height="143" fill="#5B4DFF" />
      <path d={dPathV4} className="fill-black dark:fill-white" />
    </svg>
  );
}
