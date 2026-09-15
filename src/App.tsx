import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './lib/api';
import { buildStandings, isoDate } from './lib/score';
import { useTheme } from './lib/theme';
import { useShareCard } from './lib/useShareCard';
import type { AppState, ParsedResult, Player } from './lib/types';
import type { DayRow, Standings as S } from './lib/score';
import { Setup } from './components/Setup';
import { Standings } from './components/Standings';
import { TodayTable } from './components/TodayTable';
import { LogPanel } from './components/LogPanel';
import { StreakGrid } from './components/StreakGrid';
import { GameStats } from './components/GameStats';
import { History } from './components/History';
import { Collapsible } from './components/Collapsible';
import { Logo } from './components/Logo';
import { ShareButton, ThemeButton } from './components/ShareButton';
import { ChartsModal } from './components/charts/ChartsModal';

const today = isoDate();

const prettyToday = new Date().toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric',
});

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charts, setCharts] = useState(false);
  const [theme, toggleTheme] = useTheme();

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

  const p1 = state?.players.find((p) => p.slot === 1);
  const p2 = state?.players.find((p) => p.slot === 2);
  const ready = Boolean(p1 && p2 && standings);

  if (error) {
    return (
      <div className="wrap">
        <Masthead theme={theme} onToggleTheme={toggleTheme} />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!state || !standings) {
    return (
      <div className="wrap">
        <Masthead theme={theme} onToggleTheme={toggleTheme} />
        <p className="empty">Loading.</p>
      </div>
    );
  }

  if (!ready || !p1 || !p2) {
    return (
      <div className="wrap">
        <Masthead theme={theme} onToggleTheme={toggleTheme} />
        <Setup onSave={savePlayers} />
      </div>
    );
  }

  const todayRow = standings.days.find((d) => d.date === today);
  const rest = standings.days.filter((d) => d.date !== today);

  return (
    <div className="wrap">
      <Board
        p1={p1} p2={p2} standings={standings} todayRow={todayRow} rest={rest}
        theme={theme} onToggleTheme={toggleTheme}
        onDelete={removeResult} onSave={saveResults} onRename={savePlayers}
        onOpenCharts={() => setCharts(true)}
      />
      {charts && (
        <ChartsModal onClose={() => setCharts(false)} p1={p1} p2={p2}
                     standings={standings} results={state.results} />
      )}
    </div>
  );
}

/**
 * Split out so the share card hook only ever runs once both players exist.
 * Hooks cannot sit behind the early returns above.
 */
function Board({ p1, p2, standings, todayRow, rest, theme, onToggleTheme,
                 onDelete, onSave, onRename, onOpenCharts }: {
  p1: Player; p2: Player; standings: S;
  todayRow: DayRow | undefined; rest: DayRow[];
  theme: 'light' | 'dark'; onToggleTheme: () => void;
  onDelete: (id: number) => void;
  onSave: (slot: 1 | 2, date: string, entries: ParsedResult[]) => Promise<void>;
  onRename: (names: [string, string]) => Promise<void>;
  onOpenCharts: () => void;
}) {
  const card = useShareCard({ p1, p2, row: todayRow, standings, dateLabel: prettyToday });

  return (
    <>
      <Masthead theme={theme} onToggleTheme={onToggleTheme}
                share={card.share} shareReady={card.ready} />
      {card.note && <p className="note toast">{card.note}</p>}

      <Standings p1={p1} p2={p2} standings={standings} />
      <TodayTable p1={p1} p2={p2} row={todayRow} heading="Today" onDelete={onDelete} />
      <LogPanel p1={p1} p2={p2} onSave={onSave} />

      <div className="folds">
        <Collapsible id="streaks" title="Last eight weeks">
          <StreakGrid p1={p1} p2={p2} standings={standings} />
        </Collapsible>
        <Collapsible id="bygame" title="By game">
          <GameStats p1={p1} p2={p2} standings={standings} />
        </Collapsible>
        <Collapsible id="history" title="Every day">
          <History p1={p1} p2={p2} days={rest} />
        </Collapsible>
      </div>

      <section className="analysis-cta">
        <button className="primary wide" type="button" onClick={onOpenCharts}>
          Open the analysis
        </button>
        <p className="note" style={{ marginTop: 10 }}>
          Seven charts. For ten puzzles and two people.
        </p>
      </section>

      <Footer p1={p1} p2={p2} onRename={onRename} />
    </>
  );
}

function Masthead({ theme, onToggleTheme, share, shareReady }: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  share?: () => void;
  shareReady?: boolean;
}) {
  return (
    <header className="masthead">
      <div className="brand">
        <Logo />
        <h1 className="sr-only">Daily Puzzles</h1>
        <span className="date">{prettyToday}</span>
      </div>
      <div className="actions">
        {share && <ShareButton onShare={share} ready={shareReady ?? false} />}
        <ThemeButton theme={theme} onToggle={onToggleTheme} />
      </div>
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
