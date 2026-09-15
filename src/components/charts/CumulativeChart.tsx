import { cumulativeWins } from '../../lib/analytics';
import type { DayRow } from '../../lib/score';
import { Empty, Legend, linePath, useTip } from './primitives';

const W = 540;
const H = 200;
const L = 40;
const R = 14;
const T = 14;
const B = 30;

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
};

/** Running total of head to heads won. Two series, so colour carries identity. */
export function CumulativeChart({ days, p1, p2 }: { days: DayRow[]; p1: string; p2: string }) {
  const pts = cumulativeWins(days);
  const { setTip, node } = useTip();

  if (pts.length === 0) return <Empty>Nothing to accumulate yet.</Empty>;

  const top = Math.max(1, ...pts.map((p) => Math.max(p.a, p.b)));
  const x = (i: number) =>
    pts.length === 1 ? (L + W - R) / 2 : L + (i / (pts.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);

  const series = (pick: (p: (typeof pts)[number]) => number) =>
    pts.map((p, i) => ({ x: x(i), y: y(pick(p)) }));

  const aPts = series((p) => p.a);
  const bPts = series((p) => p.b);
  const ticks = top <= 4 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, top / 2, top];

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Running total of games won by ${p1} and ${p2}.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={L - 10} y={y(t) + 4} className="chart-axis" textAnchor="end">{t}</text>
          </g>
        ))}

        {aPts.length > 1 && <path d={linePath(aPts)} className="stroke-p1" fill="none" />}
        {bPts.length > 1 && <path d={linePath(bPts)} className="stroke-p2" fill="none" />}
        {aPts.map((p, i) => <circle key={`a${i}`} cx={p.x} cy={p.y} r={5} className="dot-p1" />)}
        {bPts.map((p, i) => <circle key={`b${i}`} cx={p.x} cy={p.y} r={5} className="dot-p2" />)}

        {pts.map((p, i) => (
          <g key={p.date}
             onMouseEnter={() => setTip({
               x: (x(i) / W) * 100, y: 4,
               lines: [shortDate(p.date), `${p1}: ${p.a}`, `${p2}: ${p.b}`],
             })}
             onMouseLeave={() => setTip(null)}>
            <rect x={x(i) - 18} y={0} width={36} height={H - B} fill="transparent" />
          </g>
        ))}

        {pts.map((p, i) => (
          <text key={`x${p.date}`} x={x(i)} y={H - 8} className="chart-axis" textAnchor="middle">
            {shortDate(p.date)}
          </text>
        ))}
      </svg>
      {node}
      <Legend p1={p1} p2={p2} note="games won, running total" />
    </div>
  );
}
