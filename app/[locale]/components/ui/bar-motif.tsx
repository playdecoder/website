export function BarMotif({ size = 1 }: { size?: number }) {
  const w = Math.round(5 * size);
  const gap = Math.round(4 * size);
  const h1 = Math.round(20 * size);
  const h2 = Math.round(28 * size);
  const h3 = Math.round(14 * size);
  return (
    <span className="inline-flex shrink-0 items-end" style={{ gap }} aria-hidden>
      <span style={{ width: w, height: h1, background: "var(--bar-motif-1)", borderRadius: 2 }} />
      <span style={{ width: w, height: h2, background: "var(--bar-motif-2)", borderRadius: 2 }} />
      <span style={{ width: w, height: h3, background: "var(--bar-motif-1)", borderRadius: 2 }} />
    </span>
  );
}
