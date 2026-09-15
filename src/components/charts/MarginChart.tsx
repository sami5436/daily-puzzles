import { marginByGame } from '../../lib/analytics';
import type { DayRow } from '../../lib/score';
import { Empty, Legend, barPath, useTip } from './primitives';

const W = 540;
const ROW = 30;
const BAR = 14;
const LABEL_W = 98;
const PAD_R = 20;
const TOP = 14;

const pct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(0)}%`;

/**
 * Margin per game, as a share of the worse score, centred on parity.
 *
 * Polarity is the job here, so this is a diverging form: one hue per side of a
 * neutral midpoint. Raw scores are never compared across games, only these
 * unitless shares.
 */
export function MarginChart({ days, p1, p2 }: { days: DayRow[]; p1: string; p2: string }) {
  const rows = marginByGame(days);
  const played = rows.filter((r) => r.margin !== null);
  const { setTip, node } = useTip();

  if (played.length === 0) {
    return <Empty>No game has been played by both of you yet, so there is nothing to compare.</Empty>;
  }

  const peak = Math.max(...played.map((r) => Math.abs(r.margin ?? 0)));
  const domain = Math.max(0.25, Math.ceil(peak * 4) / 4);

  const H = TOP + rows.length * ROW + 34;
  const x0 = LABEL_W + 10;
  const x1 = W - PAD_R;
  const mid = (x0 + x1) / 2;
  const half = mid - x0;
  const at = (v: number) => mid + (v / domain) * half;

  const ticks = [-domain, -domain / 2, 0, domain / 2, domain];

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Average margin per game. Bars right of centre favour ${p1}, left favour ${p2}.`}>
        {ticks.map((t) => (
          <line key={t} x1={at(t)} x2={at(t)} y1={TOP - 6} y2={TOP + rows.length * ROW}
                className={t === 0 ? 'axis-line' : 'grid-line'} />
        ))}

        {rows.map((r, i) => {
          const y = TOP + i * ROW;
          const cy = y + ROW / 2;
          const m = r.margin;
          return (
            <g key={r.game}
               onMouseEnter={() => setTip({
                 x: 50,
                 y: (cy / H) * 100,
                 lines: m === null
                   ? [r.label, 'not played by both yet']
                   : [r.label,
                      `${m > 0 ? p1 : m < 0 ? p2 : 'level'} by ${Math.abs(m * 100).toFixed(1)}%`,
                      `${r.meetings} ${r.meetings === 1 ? 'meeting' : 'meetings'}`],
               })}
               onMouseLeave={() => setTip(null)}>
              <rect x={0} y={y} width={W} height={ROW} fill="transparent" />
              <text x={LABEL_W} y={cy + 4} className="chart-label" textAnchor="end">{r.label}</text>
              {m === null ? (
                <text x={mid + 8} y={cy + 4} className="chart-faint">not yet</text>
              ) : (
                <>
                  <path d={barPath(at(0), at(m), cy - BAR / 2, BAR)}
                        className={m >= 0 ? 'fill-p1' : 'fill-p2'} />
                  <text x={at(m) + (m >= 0 ? 8 : -8)} y={cy + 4}
                        className="chart-value" textAnchor={m >= 0 ? 'start' : 'end'}>
                    {pct(m)}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {ticks.map((t) => (
          <text key={t} x={at(t)} y={TOP + rows.length * ROW + 20}
                className="chart-axis" textAnchor="middle">
            {t === 0 ? 'level' : `${Math.abs(t * 100).toFixed(0)}%`}
          </text>
        ))}
      </svg>
      {node}
      <Legend p1={`${p1} ahead`} p2={`${p2} ahead`} note="margin as a share of the worse score" />
    </div>
  );
}
