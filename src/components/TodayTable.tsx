import { GAMES } from '../lib/games';
import { formatScore } from '../lib/score';
import type { DayRow } from '../lib/score';
import type { Player } from '../lib/types';

export function TodayTable({ p1, p2, row, heading, onDelete }: {
  p1: Player; p2: Player; row: DayRow | undefined; heading: string;
  onDelete?: (id: number) => void;
}) {
  const byGame = new Map(row?.games.map((g) => [g.game, g]) ?? []);

  return (
    <section>
      <div className="spread" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{heading}</h2>
        {row && row.games.length > 0 && (
          <span className="note num">
            {row.aWins} to {row.bWins}
            {row.winner === 'tie' ? ' · level' : ''}
          </span>
        )}
      </div>

      <div className="scroller">
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th className="score">{p1.name}</th>
              <th className="score">{p2.name}</th>
            </tr>
          </thead>
          <tbody>
            {GAMES.map((g) => {
              const cell = byGame.get(g.id);
              const o = cell?.outcome;
              return (
                <tr key={g.id}>
                  <td className="game">
                    {g.label}<span className="src">{g.source}</span>
                  </td>
                  <td className={`score num ${o === 'p1' ? 'won p1' : ''}`}>
                    {cell?.a ? (
                      <span
                        onDoubleClick={() => cell.a && onDelete?.(cell.a.id)}
                        title={onDelete ? 'Double click to remove' : undefined}
                      >{formatScore(cell.a)}</span>
                    ) : <span className="blank">·</span>}
                  </td>
                  <td className={`score num ${o === 'p2' ? 'won p2' : ''}`}>
                    {cell?.b ? (
                      <span
                        onDoubleClick={() => cell.b && onDelete?.(cell.b.id)}
                        title={onDelete ? 'Double click to remove' : undefined}
                      >{formatScore(cell.b)}</span>
                    ) : <span className="blank">·</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
