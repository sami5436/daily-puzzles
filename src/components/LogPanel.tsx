import { useMemo, useState } from 'react';
import { dedupeByGame, parseShareText } from '../lib/parse';
import { formatScore, isoDate } from '../lib/score';
import { gameMeta } from '../lib/games';
import type { ParsedResult, Player } from '../lib/types';

export function LogPanel({ p1, p2, onSave }: {
  p1: Player; p2: Player;
  onSave: (slot: 1 | 2, date: string, entries: ParsedResult[]) => Promise<void>;
}) {
  const [slot, setSlot] = useState<1 | 2>(1);
  const [date, setDate] = useState(isoDate());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const entries = useMemo(() => dedupeByGame(parseShareText(text)), [text]);
  const typed = text.trim().length > 0;

  async function save() {
    if (entries.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(slot, date, entries);
      const who = slot === 1 ? p1.name : p2.name;
      setSaved(`Saved ${entries.length} for ${who}.`);
      setText('');
      window.setTimeout(() => setSaved(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Log results</h2>
      <div className="panel">
        <div className="spread">
          <div className="tabs" role="group" aria-label="Whose results">
            <button type="button" aria-pressed={slot === 1} onClick={() => setSlot(1)}>{p1.name}</button>
            <button type="button" aria-pressed={slot === 2} onClick={() => setSlot(2)}>{p2.name}</button>
          </div>
          <input type="date" value={date} max={isoDate()} style={{ width: 'auto' }}
                 onChange={(e) => setDate(e.target.value)} aria-label="Puzzle date" />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Paste the share text here. Any number of games, any order.\n\nWordle 1,562 4/6\nQueens #123 | 0:42'}
          aria-label="Share text"
        />

        {typed && (
          <div className="preview">
            {entries.length === 0 ? (
              <p className="note">
                Nothing readable yet. Use each game&rsquo;s share button so the scores come through as text.
              </p>
            ) : (
              <ul>
                {entries.map((e) => (
                  <li key={e.game}>
                    <span className="game">{gameMeta(e.game).label}</span>
                    <span className="num">{formatScore(e)}</span>
                  </li>
                ))}
              </ul>
            )}
            <button className="primary" type="button" onClick={save} disabled={entries.length === 0 || busy}>
              {busy ? 'Saving' : `Save ${entries.length || ''}`.trim()}
            </button>
          </div>
        )}

        {saved && <p className="note" style={{ marginTop: 12 }}>{saved}</p>}
        {error && <p className="error">{error}</p>}
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        Pasting the same day again replaces it, so a mistake is fixed by pasting once more.
      </p>
    </section>
  );
}
