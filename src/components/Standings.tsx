import type { Player } from '../lib/types';
import type { Standings as S } from '../lib/score';

function Card({ player, slot, won, streak, gamesWon }: {
  player: Player; slot: 1 | 2; won: number; streak: number; gamesWon: number;
}) {
  return (
    <div className={`standing p${slot}`}>
      <div className="who"><span className="dot" />{player.name}</div>
      <div className="big num">{won}</div>
      <div className="sub num">
        {won === 1 ? 'day won' : 'days won'} · {gamesWon} {gamesWon === 1 ? 'game' : 'games'}
      </div>
      <div className="sub num">
        {streak > 0 ? `${streak} day streak` : 'no streak yet'}
      </div>
    </div>
  );
}

export function Standings({ p1, p2, standings }: { p1: Player; p2: Player; standings: S }) {
  return (
    <section>
      <div className="spread" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Standings</h2>
        {standings.daysWon.tied > 0 && (
          <span className="note num">{standings.daysWon.tied} tied</span>
        )}
      </div>
      <div className="standings">
        <Card player={p1} slot={1} won={standings.daysWon.a}
              gamesWon={standings.gamesWon.a} streak={standings.streak.a.current} />
        <Card player={p2} slot={2} won={standings.daysWon.b}
              gamesWon={standings.gamesWon.b} streak={standings.streak.b.current} />
      </div>
    </section>
  );
}
