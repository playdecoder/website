import type { CSSProperties } from "react";

const WAVE_HEIGHTS = [0.38, 0.58, 0.82, 1, 0.76, 0.52, 0.44, 0.64, 0.88, 0.56, 0.72] as const;

const GHOST_ROWS = [
  { timeW: "2.75rem", line1: "68%", line2: "42%" },
  { timeW: "2.5rem", line1: "82%", line2: "55%" },
  { timeW: "2.85rem", line1: "58%", line2: "36%" },
  { timeW: "2.4rem", line1: "74%", line2: "48%" },
] as const;

interface EpisodeTranscriptLoadingProps {
  label: string;
}

export function EpisodeTranscriptLoading({ label }: EpisodeTranscriptLoadingProps) {
  return (
    <output
      className="transcript-loading relative flex h-full flex-col items-center justify-center overflow-hidden px-5 py-6 sm:px-7 md:px-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute inset-0 py-3" aria-hidden>
        {GHOST_ROWS.map((row, index) => (
          <div
            key={index}
            className="transcript-loading__ghost-row grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-4 px-5 py-3.5 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-5 sm:px-7 sm:py-4 md:px-8"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <div className="bg-edge/12 mt-0.5 h-3 rounded-full" style={{ width: row.timeW }} />
            <div className="space-y-2">
              <div className="bg-edge/10 h-3 rounded-full" style={{ width: row.line1 }} />
              <div className="bg-edge/8 h-3 rounded-full" style={{ width: row.line2 }} />
            </div>
          </div>
        ))}
      </div>

      <div
        className="transcript-loading__scan pointer-events-none absolute inset-x-6 top-0 h-px sm:inset-x-8"
        aria-hidden
      />

      <div className="relative z-[1] flex flex-col items-center gap-5">
        <div
          className="transcript-loading__wave flex h-8 items-end justify-center gap-[3px] sm:h-9 sm:gap-1"
          aria-hidden
        >
          {WAVE_HEIGHTS.map((height, index) => (
            <div
              key={index}
              className="transcript-loading__bar decoder-waveform-bar-gradient w-[3px] rounded-full sm:w-1"
              style={
                {
                  height: `${height * 100}%`,
                  "--wave-dur": `${0.52 + (index % 4) * 0.11}s`,
                  "--wave-delay": `${index * 0.065}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <p className="text-muted font-mono text-[11px] tracking-[0.18em] uppercase">
          <span className="transcript-loading__label">{label}</span>
        </p>
      </div>
    </output>
  );
}
