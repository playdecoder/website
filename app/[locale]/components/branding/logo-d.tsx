export function LogoD() {
  return (
    <svg
      viewBox="0 0 108 140"
      aria-hidden
      focusable="false"
      style={{
        display: "inline-block",
        height: "1cap",
        width: "calc(1cap * 108 / 140)",
        verticalAlign: "baseline",
        overflow: "visible",
      }}
    >
      <path
        d="M0 0 L0 140 L20 140 Q104 140 104 70 Q104 0 20 0 Z"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path
        d="M20 0 Q104 0 104 70 Q104 140 20 140"
        stroke="var(--accent)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />

      <rect x="26" y="36" width="11" height="68" fill="var(--primary)" />
      <rect x="43" y="24" width="11" height="92" fill="var(--secondary)" />
      <rect x="60" y="48" width="11" height="44" fill="var(--primary)" />
    </svg>
  );
}
