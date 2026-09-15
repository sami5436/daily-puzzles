import { gameMeta } from '../lib/games';
import type { DayRow } from '../lib/score';
import type { Player } from '../lib/types';

function label(date: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function History({ p1, p2, days }: { p1: Player; p2: Player; days: DayRow[] }) {
  if (days.length === 0) {
    return <p className="note">Only today so far.</p>;
  }

  return (
    <>
      <div className="scroller">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Games</th>
              <th className="score">Result</th>
            </tr>
          </thead>
          <tbody>
            {days.map((row) => (
              <tr key={row.date}>
                <td className="game">{label(row.date)}</td>
                <td className="note" style={{ color: 'var(--faint)' }}>
                  {row.games.map((g) => gameMeta(g.game).label).join(', ')}
                </td>
                <td className={`score num ${row.winner === 'p1' ? 'won p1' : row.winner === 'p2' ? 'won p2' : ''}`}>
                  {row.winner === 'tie'
                    ? 'level'
                    : `${row.winner === 'p1' ? p1.name : p2.name} ${Math.max(row.aWins, row.bWins)} to ${Math.min(row.aWins, row.bWins)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
