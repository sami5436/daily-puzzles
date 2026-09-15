import { useState } from 'react';

/** A bar with its data end rounded and its baseline end square. */
export function barPath(base: number, end: number, y: number, h: number, r = 4): string {
  const right = end >= base;
  const radius = Math.min(r, Math.abs(end - base));
  const y0 = y;
  const y1 = y + h;
  return right
    ? `M ${base} ${y0} H ${end - radius} Q ${end} ${y0} ${end} ${y0 + radius}` +
      ` V ${y1 - radius} Q ${end} ${y1} ${end - radius} ${y1} H ${base} Z`
    : `M ${base} ${y0} H ${end + radius} Q ${end} ${y0} ${end} ${y0 + radius}` +
      ` V ${y1 - radius} Q ${end} ${y1} ${end + radius} ${y1} H ${base} Z`;
}

export function linePath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

export interface Tip {
  x: number;
  y: number;
  lines: string[];
}

/** Shared hover readout. Positioned against the chart box, not the page. */
export function useTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const node = tip ? (
    <div className="tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }} role="status">
      {tip.lines.map((l, i) => (
        <span key={i} className={i === 0 ? 'tip-head' : undefined}>{l}</span>
      ))}
    </div>
  ) : null;
  return { setTip, node };
}

export function Legend({ p1, p2, note }: { p1: string; p2: string; note?: string }) {
  return (
    <div className="legend chart-legend">
      <span><i className="swatch p1" />{p1}</span>
      <span><i className="swatch p2" />{p2}</span>
      {note && <span className="legend-note">{note}</span>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="chart-empty">{children}</p>;
}
