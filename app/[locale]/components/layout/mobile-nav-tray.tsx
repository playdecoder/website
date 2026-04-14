"use client";

import type { ComponentProps } from "react";

import { usePathname } from "@/i18n/navigation";

import { MobileNavDrawer } from "./mobile-nav-drawer";

type MobileNavDrawerProps = ComponentProps<typeof MobileNavDrawer>;

export function MobileNavTray(props: MobileNavDrawerProps) {
  const pathname = usePathname();
  return <MobileNavDrawer key={pathname} {...props} />;
}
