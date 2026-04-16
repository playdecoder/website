const logoDLayout = {
  display: "inline-block",
  height: "1cap",
  width: "calc(1cap * 108 / 140)",
  verticalAlign: "baseline",
  overflow: "visible",
} as const;

/** Geometry matches `public/logo/d.svg`; light/dark ink via `dark:` (single mark, no duplicate SVGs). */
export function LogoD() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 108 140"
      fill="none"
      aria-hidden
      focusable="false"
      style={logoDLayout}
    >
      <path
        d="M0 0 L0 140 L20 140 Q104 140 104 70 Q104 0 20 0 Z"
        fill="none"
        className="stroke-[#0B0F14] dark:stroke-[#E6EDF3]"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M20 0 Q104 0 104 70 Q104 140 20 140"
        className="stroke-[#E6FF00]"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="26"
        y="36"
        width="11"
        height="68"
        className="fill-[#0B0F14] dark:fill-[#E6EDF3]"
      />
      <rect x="43" y="24" width="11" height="92" className="fill-[#1E3AFF]" />
      <rect
        x="60"
        y="48"
        width="11"
        height="44"
        className="fill-[#0B0F14] dark:fill-[#E6EDF3]"
      />
    </svg>
  );
}
