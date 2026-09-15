import { useEffect, useMemo, useState } from 'react';
import { summarise } from '../../lib/analytics';
import { gameMeta } from '../../lib/games';
import { formatScore } from '../../lib/score';
import type { Standings } from '../../lib/score';
import type { Player, StoredResult } from '../../lib/types';
import { MarginChart } from './MarginChart';
import { TrendChart } from './TrendChart';
import { CumulativeChart } from './CumulativeChart';
import { RadarChart } from './RadarChart';
import { HeatmapChart } from './HeatmapChart';
import { DistributionChart } from './DistributionChart';
import { RatingChart } from './RatingChart';

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="tile">
      <div className="tile-value num">{value}</div>
      <div className="tile-label">{label}</div>
    </div>
  );
}

function DataTable({ results, players }: { results: StoredResult[]; players: Player[] }) {
  const names = new Map(players.map((p) => [p.id, p.name]));
  const rows = [...results].sort(
    (a, b) => b.puzzleDate.localeCompare(a.puzzleDate) || a.game.localeCompare(b.game),
  );
  return (
    <div className="scroller">
      <table>
        <thead>
          <tr><th>Day</th><th>Game</th><th>Player</th><th className="score">Score</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="num">{r.puzzleDate}</td>
              <td>{gameMeta(r.game).label}</td>
              <td>{names.get(r.playerId) ?? 'unknown'}</td>
              <td className="score num">{formatScore(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartsModal({ onClose, p1, p2, standings, results }: {
  onClose: () => void;
  p1: Player;
  p2: Player;
  standings: Standings;
  results: StoredResult[];
}) {
  const [table, setTable] = useState(false);
  const summary = useMemo(
    () => summarise(results, standings.days, standings),
    [results, standings],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const days = standings.days.length;
  const lead = summary.meanMargin;

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Analysis"
           onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ margin: 0 }}>Analysis</h2>
          <button className="link" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="modal-body">
          <div className="tiles">
            <Tile value={String(summary.observations)} label="results logged" />
            <Tile value={String(summary.meetings)} label="head to heads" />
            <Tile value={String(summary.gamesPlayed)} label="games in play" />
            <Tile
              value={lead == null ? '·' : `${Math.abs(lead * 100).toFixed(1)}%`}
              label={lead == null ? 'no margin yet'
                : lead > 0 ? `mean margin to ${p1.name}`
                : lead < 0 ? `mean margin to ${p2.name}` : 'dead level'} />
          </div>

          <section className="chart-section">
            <h3>Margin by game</h3>
            <p className="chart-sub">
              Each head to head reduced to a margin as a share of the worse score, then averaged.
              Unitless, so a Wordle guess and a Queens clock can sit on one axis.
            </p>
            <MarginChart days={standings.days} p1={p1.name} p2={p2.name} />
          </section>

          <section className="chart-section">
            <h3>Strength profile</h3>
            <p className="chart-sub">
              The same shares on one axis per game. The two shapes are complementary by
              construction, so this is a silhouette to recognise rather than a figure to read.
            </p>
            <RadarChart days={standings.days} p1={p1.name} p2={p2.name} />
          </section>

          <section className="chart-section">
            <h3>Results grid</h3>
            <p className="chart-sub">Who took each game on each day.</p>
            <HeatmapChart days={standings.days} p1={p1.name} p2={p2.name} />
          </section>

          <section className="chart-section">
            <h3>Scores over time</h3>
            <p className="chart-sub">Raw scores in each game's own units. One game at a time.</p>
            <TrendChart days={standings.days} p1={p1.name} p2={p2.name} />
          </section>

          <section className="chart-section">
            <h3>Margin distribution</h3>
            <p className="chart-sub">
              Every head to head as one dot, with the mean marked. Shows whether a lead comes
              from a few blowouts or from being steadily ahead.
            </p>
            <DistributionChart days={standings.days} p1={p1.name} p2={p2.name} />
          </section>

          <section className="chart-section">
            <h3>Games won, cumulative</h3>
            <p className="chart-sub">Every head to head either of you has won, added up day by day.</p>
            <CumulativeChart days={standings.days} p1={p1.name} p2={p2.name} />
          </section>

          <section className="chart-section">
            <h3>Elo rating</h3>
            <p className="chart-sub">
              Chess ratings, applied to two people and a word game. Elo assumes a large pool of
              players over a long record, which this is the opposite of. Computed properly anyway.
            </p>
            <RatingChart days={standings.days} p1={p1.name} p2={p2.name} />
          </section>

          <section className="chart-section">
            <div className="spread">
              <h3 style={{ margin: 0 }}>The data</h3>
              <button className="link" type="button" onClick={() => setTable((t) => !t)}>
                {table ? 'Hide' : 'Show'}
              </button>
            </div>
            {table && <DataTable results={results} players={[p1, p2]} />}
          </section>

          <p className="chart-foot">
            n = {summary.observations} {summary.observations === 1 ? 'result' : 'results'} over{' '}
            {days} {days === 1 ? 'day' : 'days'}. Every figure above is computed correctly.
            None of it is significant.
          </p>
        </div>
      </div>
    </div>
  );
}
