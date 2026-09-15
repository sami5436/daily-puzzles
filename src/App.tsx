import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './lib/api';
import { buildStandings, isoDate } from './lib/score';
import type { AppState, ParsedResult, Player } from './lib/types';
import { Setup } from './components/Setup';
import { Standings } from './components/Standings';
import { TodayTable } from './components/TodayTable';
import { LogPanel } from './components/LogPanel';
import { StreakGrid } from './components/StreakGrid';
import { GameStats } from './components/GameStats';
import { History } from './components/History';
import { ShareCard } from './components/ShareCard';
import { ChartsModal } from './components/charts/ChartsModal';

const today = isoDate();

const prettyToday = new Date().toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric',
});

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charts, setCharts] = useState(false);

  useEffect(() => {
    api.getState()
      .then(setState)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'could not reach the server'));
  }, []);

  const savePlayers = useCallback(async (names: [string, string]) => {
    setState(await api.setPlayers(names));
  }, []);

  const saveResults = useCallback(
    async (slot: 1 | 2, date: string, entries: ParsedResult[]) => {
      setState(await api.logResults(slot, date, entries));
    }, []);

  const removeResult = useCallback(async (id: number) => {
    setState(await api.deleteResult(id));
  }, []);

  const standings = useMemo(
    () => (state ? buildStandings(state.players, state.results, today) : null),
    [state]);

  if (error) {
    return (
      <div className="wrap">
        <Masthead />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!state || !standings) {
    return (
      <div className="wrap">
        <Masthead />
        <p className="empty">Loading.</p>
      </div>
    );
  }

  const p1 = state.players.find((p) => p.slot === 1);
  const p2 = state.players.find((p) => p.slot === 2);

  if (!p1 || !p2) {
    return (
      <div className="wrap">
        <Masthead />
        <Setup onSave={savePlayers} />
      </div>
    );
  }

  const todayRow = standings.days.find((d) => d.date === today);
  const rest = standings.days.filter((d) => d.date !== today);

  return (
    <div className="wrap">
      <Masthead />
      <Standings p1={p1} p2={p2} standings={standings} />
      <TodayTable p1={p1} p2={p2} row={todayRow} heading="Today" onDelete={removeResult} />
      <LogPanel p1={p1} p2={p2} onSave={saveResults} />
      <ShareCard p1={p1} p2={p2} row={todayRow} standings={standings} dateLabel={prettyToday} />
      {standings.days.length > 0 && <StreakGrid p1={p1} p2={p2} standings={standings} />}
      <GameStats p1={p1} p2={p2} standings={standings} />
      <History p1={p1} p2={p2} days={rest} />
      <section className="analysis-cta">
        <button className="primary wide" type="button" onClick={() => setCharts(true)}>
          Open the analysis
        </button>
        <p className="note" style={{ marginTop: 10 }}>
          Charts. For ten puzzles and two people.
        </p>
      </section>
      <Footer p1={p1} p2={p2} onRename={savePlayers} />
      {charts && (
        <ChartsModal onClose={() => setCharts(false)} p1={p1} p2={p2}
                     standings={standings} results={state.results} />
      )}
    </div>
  );
}

function Masthead() {
  return (
    <header className="masthead">
      <h1>Daily Puzzles</h1>
      <span className="date">{prettyToday}</span>
    </header>
  );
}

function Footer({ p1, p2, onRename }: {
  p1: Player; p2: Player; onRename: (names: [string, string]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState(p1.name);
  const [b, setB] = useState(p2.name);

  if (!editing) {
    return (
      <section>
        <button className="link" type="button" onClick={() => setEditing(true)}>
          Change names
        </button>
      </section>
    );
  }

  return (
    <section>
      <div className="row">
        <input type="text" value={a} maxLength={40} style={{ width: 150 }}
               onChange={(e) => setA(e.target.value)} aria-label="First player name" />
        <input type="text" value={b} maxLength={40} style={{ width: 150 }}
               onChange={(e) => setB(e.target.value)} aria-label="Second player name" />
        <button className="primary" type="button"
                disabled={!a.trim() || !b.trim()}
                onClick={async () => {
                  await onRename([a.trim(), b.trim()]);
                  setEditing(false);
                }}>Save</button>
        <button className="link" type="button" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </section>
  );
}
