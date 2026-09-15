import { addDays, isoDate } from '../lib/score';
import type { Standings } from '../lib/score';
import type { Player } from '../lib/types';

const DAYS = 56;

export function StreakGrid({ p1, p2, standings }: { p1: Player; p2: Player; standings: Standings }) {
  const today = isoDate();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - DAYS + 1));

  const a = standings.streak.a;
  const b = standings.streak.b;

  return (
    <>
      <div className="grid">
        {days.map((d) => {
          const inA = a.playedDates.has(d);
          const inB = b.playedDates.has(d);
          const cls = inA && inB ? 'both' : inA ? 'p1' : inB ? 'p2' : '';
          return <div key={d} className={`cell ${cls}`} title={d} />;
        })}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--p1)' }} />{p1.name}</span>
        <span><i style={{ background: 'var(--p2)' }} />{p2.name}</span>
        <span><i style={{ background: 'linear-gradient(135deg, var(--p1) 50%, var(--p2) 50%)' }} />both</span>
      </div>
      <p className="note num" style={{ marginTop: 12 }}>
        {p1.name}: {a.current} now, {a.longest} best · {p2.name}: {b.current} now, {b.longest} best
      </p>
    </>
  );
}
