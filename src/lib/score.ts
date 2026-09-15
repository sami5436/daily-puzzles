import { GAME_IDS, gameMeta } from './games';
import type { GameId, Player, StoredResult } from './types';

/** Local calendar date as YYYY-MM-DD. Never use toISOString, it shifts to UTC. */
export function isoDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return isoDate(new Date(y, m - 1, d + delta));
}

/** The comparable number for a result. Lower always wins. */
export function metricValue(r: StoredResult): number | null {
  switch (gameMeta(r.game).metric) {
    case 'time':
      return r.seconds;
    case 'guesses':
      return r.guesses;
    case 'hints':
      return r.hints;
  }
}

export function formatScore(r: StoredResult): string {
  if (!r.solved && r.game === 'wordle') return 'X/6';
  switch (r.game) {
    case 'wordle':
      return `${r.guesses}/6`;
    case 'strands':
      return r.hints === 0 ? 'no hints' : `${r.hints} hint${r.hints === 1 ? '' : 's'}`;
    case 'pinpoint':
      return `${r.guesses} guess${r.guesses === 1 ? '' : 'es'}`;
    default:
      return formatTime(r.seconds);
  }
}

export function formatTime(seconds: number | null): string {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export type Outcome = 'p1' | 'p2' | 'tie' | 'none';

/** Decides one head to head. A missing result is a forfeit, not a tie. */
export function outcome(a: StoredResult | undefined, b: StoredResult | undefined): Outcome {
  if (!a && !b) return 'none';
  if (a && !b) return 'p1';
  if (b && !a) return 'p2';
  const va = metricValue(a!);
  const vb = metricValue(b!);
  if (va == null && vb == null) return 'tie';
  if (va == null) return 'p2';
  if (vb == null) return 'p1';
  if (va === vb) return 'tie';
  return va < vb ? 'p1' : 'p2';
}

export interface DayRow {
  date: string;
  games: { game: GameId; a?: StoredResult; b?: StoredResult; outcome: Outcome }[];
  aWins: number;
  bWins: number;
  winner: Outcome;
}

export interface Standings {
  days: DayRow[];
  daysWon: { a: number; b: number; tied: number };
  gamesWon: { a: number; b: number };
  perGame: Record<GameId, { a: number; b: number; played: number; aBest: number | null; bBest: number | null; aAvg: number | null; bAvg: number | null }>;
  streak: { a: Streak; b: Streak };
}

export interface Streak {
  current: number;
  longest: number;
  playedDates: Set<string>;
}

function index(results: StoredResult[], playerId: number) {
  const map = new Map<string, StoredResult>();
  for (const r of results) {
    if (r.playerId === playerId) map.set(`${r.puzzleDate}|${r.game}`, r);
  }
  return map;
}

export function buildStandings(players: Player[], results: StoredResult[], today = isoDate()): Standings {
  const p1 = players.find((p) => p.slot === 1);
  const p2 = players.find((p) => p.slot === 2);
  const aIdx = p1 ? index(results, p1.id) : new Map();
  const bIdx = p2 ? index(results, p2.id) : new Map();

  const dates = [...new Set(results.map((r) => r.puzzleDate))].sort().reverse();

  const perGame = {} as Standings['perGame'];
  const totals = {} as Record<GameId, { a: number[]; b: number[] }>;
  for (const g of GAME_IDS) {
    perGame[g] = { a: 0, b: 0, played: 0, aBest: null, bBest: null, aAvg: null, bAvg: null };
    totals[g] = { a: [], b: [] };
  }

  const days: DayRow[] = [];
  const daysWon = { a: 0, b: 0, tied: 0 };
  const gamesWon = { a: 0, b: 0 };

  for (const date of dates) {
    const row: DayRow = { date, games: [], aWins: 0, bWins: 0, winner: 'none' };

    for (const game of GAME_IDS) {
      const a = aIdx.get(`${date}|${game}`);
      const b = bIdx.get(`${date}|${game}`);
      if (!a && !b) continue;

      const o = outcome(a, b);
      row.games.push({ game, a, b, outcome: o });

      if (a && b) {
        perGame[game].played += 1;
        if (o === 'p1') { row.aWins += 1; gamesWon.a += 1; perGame[game].a += 1; }
        if (o === 'p2') { row.bWins += 1; gamesWon.b += 1; perGame[game].b += 1; }
      }

      const va = a ? metricValue(a) : null;
      const vb = b ? metricValue(b) : null;
      if (va != null) totals[game].a.push(va);
      if (vb != null) totals[game].b.push(vb);
    }

    if (row.games.length === 0) continue;
    if (row.aWins > row.bWins) { row.winner = 'p1'; daysWon.a += 1; }
    else if (row.bWins > row.aWins) { row.winner = 'p2'; daysWon.b += 1; }
    else { row.winner = 'tie'; daysWon.tied += 1; }
    days.push(row);
  }

  for (const game of GAME_IDS) {
    const { a, b } = totals[game];
    perGame[game].aBest = a.length ? Math.min(...a) : null;
    perGame[game].bBest = b.length ? Math.min(...b) : null;
    perGame[game].aAvg = a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    perGame[game].bAvg = b.length ? b.reduce((x, y) => x + y, 0) / b.length : null;
  }

  return {
    days,
    daysWon,
    gamesWon,
    perGame,
    streak: {
      a: streakFor(results, p1?.id, today),
      b: streakFor(results, p2?.id, today),
    },
  };
}

/**
 * A day counts toward a streak if the player logged anything at all that day.
 * The current streak may end on today or yesterday, so the counter does not
 * collapse to zero every morning before anyone has played.
 */
export function streakFor(results: StoredResult[], playerId: number | undefined, today: string): Streak {
  const playedDates = new Set(
    results.filter((r) => r.playerId === playerId).map((r) => r.puzzleDate),
  );
  if (playedDates.size === 0) return { current: 0, longest: 0, playedDates };

  let current = 0;
  let cursor = playedDates.has(today) ? today : addDays(today, -1);
  while (playedDates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...playedDates].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, playedDates };
}
