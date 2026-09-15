import { ratings } from '../../lib/analytics';
import type { DayRow } from '../../lib/score';
import { Empty, Legend, linePath, useTip } from './primitives';

const W = 540;
const H = 200;
const L = 46;
const R = 14;
const T = 16;
const B = 30;

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
};

/** Elo after each day. Two series, so colour carries identity. */
export function RatingChart({ days, p1, p2 }: { days: DayRow[]; p1: string; p2: string }) {
  const pts = ratings(days);
  const { setTip, node } = useTip();

  if (pts.length === 0) return <Empty>No games rated yet.</Empty>;

  const all = pts.flatMap((p) => [p.a, p.b]);
  const lo = Math.min(1500, ...all);
  const hi = Math.max(1500, ...all);
  const pad = Math.max(8, (hi - lo) * 0.25);
  const yMin = lo - pad;
  const yMax = hi + pad;

  const x = (i: number) =>
    pts.length === 1 ? (L + W - R) / 2 : L + (i / (pts.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - T - B);

  const series = (pick: (p: (typeof pts)[number]) => number) =>
    pts.map((p, i) => ({ x: x(i), y: y(pick(p)) }));

  const aPts = series((p) => p.a);
  const bPts = series((p) => p.b);

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Elo rating after each day for ${p1} and ${p2}.`}>
        {[yMin, 1500, yMax].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)}
                  className={t === 1500 ? 'axis-line' : 'grid-line'} />
            <text x={L - 10} y={y(t) + 4} className="chart-axis" textAnchor="end">
              {Math.round(t)}
            </text>
          </g>
        ))}

        {aPts.length > 1 && <path d={linePath(aPts)} className="stroke-p1" fill="none" />}
        {bPts.length > 1 && <path d={linePath(bPts)} className="stroke-p2" fill="none" />}
        {aPts.map((p, i) => <circle key={`a${i}`} cx={p.x} cy={p.y} r={5} className="dot-p1" />)}
        {bPts.map((p, i) => <circle key={`b${i}`} cx={p.x} cy={p.y} r={5} className="dot-p2" />)}

        {pts.map((p, i) => (
          <g key={p.date}
             onMouseEnter={() => setTip({
               x: (x(i) / W) * 100, y: 2,
               lines: [shortDate(p.date),
                       `${p1}: ${Math.round(p.a)}`,
                       `${p2}: ${Math.round(p.b)}`],
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
      <Legend p1={p1} p2={p2} note="both start at 1500, K factor 24" />
    </div>
  );
}
