"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

type ThemePreference = "light" | "dark" | "system";

function IconSun({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconDevice({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}

function subscribeToNothing() {
  return () => {};
}

export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const preference: ThemePreference =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system";

  const modeLabel =
    preference === "light" ? t("modeLight") : preference === "dark" ? t("modeDark") : t("modeDevice");

  function cycleTheme() {
    if (preference === "light") {
      setTheme("dark");
      return;
    }
    if (preference === "dark") {
      setTheme("system");
      return;
    }
    setTheme("light");
  }

  return (
    <button
      suppressHydrationWarning
      type="button"
      onClick={cycleTheme}
      className="border-edge text-muted hover:text-primary hover:border-primary/40 group flex size-10 shrink-0 items-center justify-center rounded-sm border transition-all duration-200"
      aria-label={mounted ? t("switcherAria", { mode: modeLabel }) : t("toggle")}
      title={mounted ? t("switcherTitle", { mode: modeLabel }) : t("toggle")}
    >
      {!mounted ? (
        <IconMoon className="transition-transform duration-300 group-hover:-rotate-12" />
      ) : preference === "system" ? (
        <IconDevice className="transition-transform duration-300 group-hover:scale-105" />
      ) : preference === "light" ? (
        <IconSun className="transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <IconMoon className="transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}
