import { useMemo, useState } from 'react';
import { seriesForGame } from '../../lib/analytics';
import { GAMES, gameMeta } from '../../lib/games';
import { formatMetric } from '../../lib/score';
import type { DayRow } from '../../lib/score';
import type { GameId } from '../../lib/types';
import { Empty, Legend, linePath, useTip } from './primitives';

const W = 540;
const H = 220;
const L = 52;
const R = 14;
const T = 14;
const B = 30;

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
};

/** Scores for one game over time. Two series, so colour carries identity. */
export function TrendChart({ days, p1, p2 }: { days: DayRow[]; p1: string; p2: string }) {
  const available = useMemo(
    () => GAMES.filter((g) => seriesForGame(g.id, days).length > 0),
    [days],
  );
  const [game, setGame] = useState<GameId | null>(null);
  const active = game && available.some((g) => g.id === game) ? game : available[0]?.id ?? null;
  const points = useMemo(() => (active ? seriesForGame(active, days) : []), [active, days]);
  const { setTip, node } = useTip();

  if (!active || points.length === 0) {
    return <Empty>Log a game and its scores will start plotting here.</Empty>;
  }

  const values = points.flatMap((p) => [p.a, p.b]).filter((v): v is number => v != null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = hi === lo ? Math.max(1, hi * 0.2) : (hi - lo) * 0.2;
  const yMin = Math.max(0, lo - pad);
  const yMax = hi + pad;

  const x = (i: number) =>
    points.length === 1 ? (L + W - R) / 2 : L + (i / (points.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - T - B);

  const line = (pick: (p: (typeof points)[number]) => number | null) =>
    points
      .map((p, i) => ({ v: pick(p), i }))
      .filter((d): d is { v: number; i: number } => d.v != null)
      .map((d) => ({ x: x(d.i), y: y(d.v) }));

  const aPts = line((p) => p.a);
  const bPts = line((p) => p.b);
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <div className="chart-box">
      <div className="chip-row" role="group" aria-label="Choose a game">
        {available.map((g) => (
          <button key={g.id} type="button" className="chip" aria-pressed={g.id === active}
                  onClick={() => setGame(g.id)}>{g.label}</button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`${gameMeta(active).label} scores over time for ${p1} and ${p2}.`}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={L - 10} y={y(t) + 4} className="chart-axis" textAnchor="end">
              {formatMetric(active, t)}
            </text>
          </g>
        ))}

        {aPts.length > 1 && <path d={linePath(aPts)} className="stroke-p1" fill="none" />}
        {bPts.length > 1 && <path d={linePath(bPts)} className="stroke-p2" fill="none" />}

        {aPts.map((p, i) => <circle key={`a${i}`} cx={p.x} cy={p.y} r={5} className="dot-p1" />)}
        {bPts.map((p, i) => <circle key={`b${i}`} cx={p.x} cy={p.y} r={5} className="dot-p2" />)}

        {points.map((p, i) => (
          <g key={p.date}
             onMouseEnter={() => setTip({
               x: (x(i) / W) * 100,
               y: 4,
               lines: [
                 shortDate(p.date),
                 `${p1}: ${p.a != null ? formatMetric(active, p.a) : 'no result'}`,
                 `${p2}: ${p.b != null ? formatMetric(active, p.b) : 'no result'}`,
               ],
             })}
             onMouseLeave={() => setTip(null)}>
            <rect x={x(i) - 18} y={0} width={36} height={H - B} fill="transparent" />
          </g>
        ))}

        {points.map((p, i) => (
          <text key={`x${p.date}`} x={x(i)} y={H - 8} className="chart-axis" textAnchor="middle">
            {shortDate(p.date)}
          </text>
        ))}
      </svg>
      {node}
      <Legend p1={p1} p2={p2} note="lower is better" />
      {points.length === 1 && (
        <p className="chart-note">One day so far. A second day turns these dots into lines.</p>
      )}
    </div>
  );
}
