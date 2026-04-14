import Image from "next/image";

import { cn } from "@/lib/cn";

interface DecoderLogoPairProps {
  className?: string;
}

export function DecoderLogoPair({ className }: DecoderLogoPairProps) {
  return (
    <>
      <Image
        src="/icon-dark.svg"
        alt=""
        width={128}
        height={128}
        className={cn("hidden h-7 w-7 object-contain dark:block", className)}
        aria-hidden
      />
      <Image
        src="/icon.svg"
        alt=""
        width={128}
        height={128}
        className={cn("block h-7 w-7 object-contain dark:hidden", className)}
        aria-hidden
      />
    </>
  );
}
