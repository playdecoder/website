import { cn } from "@/lib/cn";

import { BarMotif } from "./bar-motif";

interface RailProps {
  variant: "rail";
  label: string;
  barSize?: number;
  className?: string;
}

interface CenterProps {
  variant: "center";
  label: string;
  barSize?: number;
  className?: string;
}

type SectionHeadingProps = RailProps | CenterProps;

export function SectionHeading(props: SectionHeadingProps) {
  const { label, barSize = 0.8, className } = props;

  if (props.variant === "center") {
    return (
      <div className={cn("flex items-center justify-center gap-4 mb-14", className)}>
        <span className="bg-edge h-px max-w-32 flex-1" />
        <BarMotif size={barSize} />
        <span className="text-muted mx-2 font-mono text-xs tracking-[0.25em] uppercase">
          {label}
        </span>
        <BarMotif size={barSize} />
        <span className="bg-edge h-px max-w-32 flex-1" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4 scroll-reveal", className)}>
      <BarMotif size={barSize} />
      <span className="text-muted font-mono text-xs tracking-[0.25em] uppercase">{label}</span>
      <span className="bg-edge h-px flex-1" />
    </div>
  );
}
