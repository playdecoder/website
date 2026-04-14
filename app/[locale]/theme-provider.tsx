"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

const clientScriptProps = { type: "application/json" } as const;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scriptProps = typeof window === "undefined" ? undefined : clientScriptProps;

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      scriptProps={scriptProps}
    >
      {children}
    </NextThemesProvider>
  );
}
