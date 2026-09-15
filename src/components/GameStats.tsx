import { GAMES } from '../lib/games';
import { formatMetric } from '../lib/score';
import type { Standings } from '../lib/score';
import type { Player } from '../lib/types';

export function GameStats({ p1, p2, standings }: { p1: Player; p2: Player; standings: Standings }) {
  const played = GAMES.filter((g) => {
    const s = standings.perGame[g.id];
    return s.aBest != null || s.bBest != null;
  });

  if (played.length === 0) return null;

  return (
    <section>
      <h2>By game</h2>
      <div className="scroller">
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th className="score">Record</th>
              <th className="score">{p1.name} avg</th>
              <th className="score">{p2.name} avg</th>
            </tr>
          </thead>
          <tbody>
            {played.map((g) => {
              const s = standings.perGame[g.id];
              const lead = s.a > s.b ? 'p1' : s.b > s.a ? 'p2' : '';
              return (
                <tr key={g.id}>
                  <td className="game">{g.label}</td>
                  <td className={`score num ${lead ? `won ${lead}` : ''}`}>
                    {s.played > 0 ? `${s.a} to ${s.b}` : <span className="blank">·</span>}
                  </td>
                  <td className="score num">
                    {s.aAvg != null ? formatMetric(g.id, s.aAvg) : <span className="blank">·</span>}
                  </td>
                  <td className="score num">
                    {s.bAvg != null ? formatMetric(g.id, s.bAvg) : <span className="blank">·</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        Record counts only days you both played the same game.
      </p>
    </section>
  );
}
