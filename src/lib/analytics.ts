import { GAMES, gameMeta } from './games';
import { metricValue } from './score';
import type { DayRow, Standings } from './score';
import type { GameId, StoredResult } from './types';

/**
 * Series derived for the charts.
 *
 * Games are scored in different units, so nothing here compares a Wordle guess
 * to a Queens clock directly. Cross game figures are always relative: each head
 * to head is reduced to a margin as a share of the slower or worse score, which
 * is unitless and therefore safe to average.
 */

export interface GameMargin {
  game: GameId;
  label: string;
  /** Positive favours player one. Range -1 to 1. Null when never both played. */
  margin: number | null;
  meetings: number;
}

/** One head to head as a signed share of the worse score. */
export function relativeMargin(a: number, b: number): number {
  const worst = Math.max(a, b);
  if (worst === 0) return 0; // both perfect, nothing between them
  return (b - a) / worst;
}

export function marginByGame(days: DayRow[]): GameMargin[] {
  return GAMES.map((g) => {
    const margins: number[] = [];
    for (const day of days) {
      const cell = day.games.find((x) => x.game === g.id);
      if (!cell?.a || !cell.b) continue;
      const va = metricValue(cell.a);
      const vb = metricValue(cell.b);
      if (va == null || vb == null) continue;
      margins.push(relativeMargin(va, vb));
    }
    return {
      game: g.id,
      label: g.label,
      meetings: margins.length,
      margin: margins.length
        ? margins.reduce((x, y) => x + y, 0) / margins.length
        : null,
    };
  });
}

export interface Point {
  date: string;
  a: number | null;
  b: number | null;
}

/** Raw scores for one game across every day it was played. */
export function seriesForGame(game: GameId, days: DayRow[]): Point[] {
  return days
    .map((day) => {
      const cell = day.games.find((x) => x.game === game);
      if (!cell) return null;
      return {
        date: day.date,
        a: cell.a ? metricValue(cell.a) : null,
        b: cell.b ? metricValue(cell.b) : null,
      };
    })
    .filter((p): p is Point => p !== null)
    .sort((x, y) => x.date.localeCompare(y.date));
}

export interface CumulativePoint {
  date: string;
  a: number;
  b: number;
}

/** Running total of head to heads won, oldest day first. */
export function cumulativeWins(days: DayRow[]): CumulativePoint[] {
  let a = 0;
  let b = 0;
  return [...days]
    .sort((x, y) => x.date.localeCompare(y.date))
    .map((day) => {
      for (const g of day.games) {
        if (g.outcome === 'p1') a += 1;
        if (g.outcome === 'p2') b += 1;
      }
      return { date: day.date, a, b };
    });
}

export interface Summary {
  observations: number;
  meetings: number;
  decidedDays: number;
  meanMargin: number | null;
  gamesPlayed: number;
}

export function summarise(results: StoredResult[], days: DayRow[], standings: Standings): Summary {
  const margins = marginByGame(days).filter((m) => m.margin !== null);
  const meetings = margins.reduce((n, m) => n + m.meetings, 0);
  return {
    observations: results.length,
    meetings,
    decidedDays: standings.daysWon.a + standings.daysWon.b,
    gamesPlayed: new Set(results.map((r) => r.game)).size,
    meanMargin: margins.length
      ? margins.reduce((n, m) => n + (m.margin ?? 0) * m.meetings, 0) / (meetings || 1)
      : null,
  };
}

export const gameLabel = (id: GameId) => gameMeta(id).label;

export interface MarginPoint {
  game: GameId;
  date: string;
  margin: number;
}

/** Every individual head to head as a signed margin, for the distribution. */
export function allMargins(days: DayRow[]): MarginPoint[] {
  const out: MarginPoint[] = [];
  for (const day of days) {
    for (const cell of day.games) {
      if (!cell.a || !cell.b) continue;
      const va = metricValue(cell.a);
      const vb = metricValue(cell.b);
      if (va == null || vb == null) continue;
      out.push({ game: cell.game, date: day.date, margin: relativeMargin(va, vb) });
    }
  }
  return out;
}

export interface Rating {
  date: string;
  a: number;
  b: number;
}

const START = 1500;
const K = 24;

/**
 * An Elo rating updated on every head to head.
 *
 * Elo is built for large pools of players over long records. Two people over a
 * handful of days is not that, so this is a curiosity rather than a measurement.
 * It is computed the standard way regardless.
 */
export function ratings(days: DayRow[]): Rating[] {
  let a = START;
  let b = START;
  return [...days]
    .sort((x, y) => x.date.localeCompare(y.date))
    .map((day) => {
      for (const cell of day.games) {
        if (!cell.a || !cell.b) continue;
        const expected = 1 / (1 + 10 ** ((b - a) / 400));
        const score = cell.outcome === 'p1' ? 1 : cell.outcome === 'p2' ? 0 : 0.5;
        const delta = K * (score - expected);
        a += delta;
        b -= delta;
      }
      return { date: day.date, a, b };
    });
}

/** Share of each game's head to head, 0 to 1, for the radar. */
export function strengthProfile(days: DayRow[]): { game: GameId; label: string; a: number; b: number }[] {
  return marginByGame(days)
    .filter((m) => m.margin !== null)
    .map((m) => {
      const share = (1 + (m.margin ?? 0)) / 2;
      return { game: m.game, label: m.label, a: share, b: 1 - share };
    });
}

export interface Cell {
  game: GameId;
  date: string;
  outcome: 'p1' | 'p2' | 'tie' | 'none';
}

/** Outcome grid for the heatmap: every game against every logged day. */
export function outcomeGrid(days: DayRow[]): { dates: string[]; games: GameId[]; cells: Cell[] } {
  const dates = [...days].map((d) => d.date).sort();
  const games = GAMES.map((g) => g.id).filter((id) =>
    days.some((d) => d.games.some((c) => c.game === id)),
  );
  const cells: Cell[] = [];
  for (const day of days) {
    for (const id of games) {
      const cell = day.games.find((c) => c.game === id);
      cells.push({ game: id, date: day.date, outcome: cell ? cell.outcome : 'none' });
    }
  }
  return { dates, games, cells };
}
