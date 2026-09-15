import { strengthProfile } from '../../lib/analytics';
import type { DayRow } from '../../lib/score';
import { Empty, Legend, useTip } from './primitives';

const W = 540;
const H = 400;
const CX = W / 2;
const CY = 196;
const R = 132;

const RINGS = [0.25, 0.5, 0.75, 1];

/**
 * Share of each game's head to head, one axis per game.
 *
 * The two shares always sum to one, so the polygons are complementary by
 * construction. It is a shape to recognise, not a measurement to read off.
 */
export function RadarChart({ days, p1, p2 }: { days: DayRow[]; p1: string; p2: string }) {
  const rows = strengthProfile(days);
  const { setTip, node } = useTip();

  if (rows.length < 3) {
    return <Empty>Three games played by both of you and this fills in. {rows.length} so far.</Empty>;
  }

  const n = rows.length;
  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pt = (i: number, v: number) => ({
    x: CX + Math.cos(angle(i)) * R * v,
    y: CY + Math.sin(angle(i)) * R * v,
  });

  const poly = (pick: (r: (typeof rows)[number]) => number) =>
    rows.map((r, i) => { const p = pt(i, pick(r)); return `${p.x},${p.y}`; }).join(' ');

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Share of each game won, ${p1} against ${p2}, one axis per game.`}>
        {RINGS.map((ring) => (
          <polygon key={ring} className="grid-line" fill="none"
                   points={rows.map((_, i) => {
                     const p = pt(i, ring);
                     return `${p.x},${p.y}`;
                   }).join(' ')} />
        ))}

        {rows.map((r, i) => {
          const edge = pt(i, 1);
          return <line key={r.game} x1={CX} y1={CY} x2={edge.x} y2={edge.y} className="grid-line" />;
        })}

        <polygon points={poly((r) => r.a)} className="radar-p1" />
        <polygon points={poly((r) => r.b)} className="radar-p2" />

        {rows.map((r, i) => {
          const a = pt(i, r.a);
          const b = pt(i, r.b);
          return (
            <g key={`${r.game}-pts`}>
              <circle cx={a.x} cy={a.y} r={4} className="dot-p1" />
              <circle cx={b.x} cy={b.y} r={4} className="dot-p2" />
            </g>
          );
        })}

        {rows.map((r, i) => {
          const label = pt(i, 1.17);
          const cos = Math.cos(angle(i));
          const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
          return (
            <g key={`${r.game}-label`}
               onMouseEnter={() => setTip({
                 x: 50, y: 2,
                 lines: [r.label,
                         `${p1} ${(r.a * 100).toFixed(0)}%`,
                         `${p2} ${(r.b * 100).toFixed(0)}%`],
               })}
               onMouseLeave={() => setTip(null)}>
              <text x={label.x} y={label.y + 4} className="chart-axis" textAnchor={anchor}>
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
      {node}
      <Legend p1={p1} p2={p2} note="share of each head to head" />
    </div>
  );
}
