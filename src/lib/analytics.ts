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
