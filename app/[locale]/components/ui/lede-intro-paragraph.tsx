import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function LedeIntroParagraph({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("font-body lede-rail text-muted text-base md:text-lg", className)}>{children}</p>
  );
}
