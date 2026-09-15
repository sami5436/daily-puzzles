import { allMargins } from '../../lib/analytics';
import { gameMeta } from '../../lib/games';
import type { DayRow } from '../../lib/score';
import { Empty, Legend, useTip } from './primitives';

const W = 540;
const H = 150;
const L = 20;
const R = 20;
const AXIS = 104;

/** Every head to head as one dot on a shared margin axis, plus the mean. */
export function DistributionChart({ days, p1, p2 }: { days: DayRow[]; p1: string; p2: string }) {
  const pts = allMargins(days);
  const { setTip, node } = useTip();

  if (pts.length === 0) return <Empty>No head to heads to spread out yet.</Empty>;

  const x = (m: number) => L + ((m + 1) / 2) * (W - L - R);
  const mean = pts.reduce((n, p) => n + p.margin, 0) / pts.length;

  // Nudge overlapping dots apart vertically so none hide behind another.
  const seen = new Map<number, number>();
  const placed = pts.map((p) => {
    const slot = Math.round(x(p.margin) / 12);
    const depth = seen.get(slot) ?? 0;
    seen.set(slot, depth + 1);
    return { ...p, cx: x(p.margin), cy: AXIS - 16 - depth * 13 };
  });

  const ticks = [-1, -0.5, 0, 0.5, 1];

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Spread of every head to head margin between ${p1} and ${p2}.`}>
        {ticks.map((t) => (
          <line key={t} x1={x(t)} x2={x(t)} y1={16} y2={AXIS}
                className={t === 0 ? 'axis-line' : 'grid-line'} />
        ))}
        <line x1={L} x2={W - R} y1={AXIS} y2={AXIS} className="axis-line" />

        {placed.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={5}
                  className={p.margin >= 0 ? 'dot-p1' : 'dot-p2'}
                  onMouseEnter={() => setTip({
                    x: (p.cx / W) * 100, y: 2,
                    lines: [gameMeta(p.game).label,
                            `${p.margin >= 0 ? p1 : p2} by ${Math.abs(p.margin * 100).toFixed(1)}%`],
                  })}
                  onMouseLeave={() => setTip(null)} />
        ))}

        <line x1={x(mean)} x2={x(mean)} y1={20} y2={AXIS + 6} className="mean-line" />
        <text x={x(mean)} y={14} className="chart-value" textAnchor="middle">
          mean {(mean * 100).toFixed(1)}%
        </text>

        {ticks.map((t) => (
          <text key={t} x={x(t)} y={AXIS + 20} className="chart-axis" textAnchor="middle">
            {t === 0 ? 'level' : `${Math.abs(t * 100)}%`}
          </text>
        ))}
        <text x={L} y={H - 6} className="chart-axis">{p2} ahead</text>
        <text x={W - R} y={H - 6} className="chart-axis" textAnchor="end">{p1} ahead</text>
      </svg>
      {node}
      <Legend p1={`${p1} won it`} p2={`${p2} won it`} note={`${pts.length} head to heads`} />
    </div>
  );
}
