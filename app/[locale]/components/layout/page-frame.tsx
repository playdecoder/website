import type { ReactNode } from "react";

interface DecoderPageFrameProps {
  children: ReactNode;
  className?: string;
  scanPeriodSec?: number;
  scanOpacity?: number;
}

export function DecoderPageFrame({
  children,
  className = "",
  scanPeriodSec = 7,
  scanOpacity = 0.35,
}: DecoderPageFrameProps) {
  return (
    <section
      className={`dot-grid relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-px"
        style={{
          background: "linear-gradient(to right, transparent, var(--secondary), transparent)",
          opacity: scanOpacity,
          animation: `scan ${scanPeriodSec}s linear infinite`,
          animationDelay: "1.5s",
        }}
      />

      <span className="border-edge absolute top-8 left-6 h-5 w-5 border-t border-l" />
      <span className="border-edge absolute top-8 right-6 h-5 w-5 border-t border-r" />
      <span className="border-edge absolute bottom-8 left-6 h-5 w-5 border-b border-l" />
      <span className="border-edge absolute right-6 bottom-8 h-5 w-5 border-r border-b" />

      {children}
    </section>
  );
}
