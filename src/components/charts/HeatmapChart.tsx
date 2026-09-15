import { outcomeGrid } from '../../lib/analytics';
import { gameMeta } from '../../lib/games';
import type { DayRow } from '../../lib/score';
import { Empty, useTip } from './primitives';

const W = 540;
const LABEL = 96;
const GAP = 2;
const MAX_CELL = 34;

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
};

/** Who took each game on each day. Categorical cells, so a legend carries identity. */
export function HeatmapChart({ days, p1, p2 }: { days: DayRow[]; p1: string; p2: string }) {
  const { dates, games, cells } = outcomeGrid(days);
  const { setTip, node } = useTip();

  if (games.length === 0) return <Empty>Nothing logged to lay out yet.</Empty>;

  const avail = W - LABEL - 10;
  const cell = Math.min(MAX_CELL, avail / Math.max(dates.length, 1) - GAP);
  const rowH = Math.min(MAX_CELL, 26);
  const H = 22 + games.length * (rowH + GAP) + 24;

  const cx = (d: string) => LABEL + 10 + dates.indexOf(d) * (cell + GAP);
  const cy = (g: string) => 22 + games.indexOf(g as never) * (rowH + GAP);

  const klass = (o: string) =>
    o === 'p1' ? 'cell-p1' : o === 'p2' ? 'cell-p2' : o === 'tie' ? 'cell-tie' : 'cell-none';

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Grid of which player won each game on each day.`}>
        {dates.map((d) => (
          <text key={d} x={cx(d) + cell / 2} y={14} className="chart-axis" textAnchor="middle">
            {shortDate(d)}
          </text>
        ))}

        {games.map((g) => (
          <text key={g} x={LABEL} y={cy(g) + rowH / 2 + 4} className="chart-label" textAnchor="end">
            {gameMeta(g).label}
          </text>
        ))}

        {cells.map((c) => (
          <rect key={`${c.game}-${c.date}`} x={cx(c.date)} y={cy(c.game)}
                width={cell} height={rowH} className={klass(c.outcome)}
                onMouseEnter={() => setTip({
                  x: 50, y: 2,
                  lines: [`${gameMeta(c.game).label}, ${shortDate(c.date)}`,
                          c.outcome === 'p1' ? `${p1} took it`
                          : c.outcome === 'p2' ? `${p2} took it`
                          : c.outcome === 'tie' ? 'level'
                          : 'not played'],
                })}
                onMouseLeave={() => setTip(null)} />
        ))}
      </svg>
      {node}
      <div className="legend chart-legend">
        <span><i className="swatch p1" />{p1}</span>
        <span><i className="swatch p2" />{p2}</span>
        <span><i className="swatch tie" />level</span>
        <span><i className="swatch none" />not played</span>
      </div>
    </div>
  );
}
