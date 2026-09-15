import { describe, expect, it } from 'vitest';
import { addDays, buildStandings, formatScore, formatTime, outcome, streakFor } from './score';
import type { Player, StoredResult } from './types';

const players: Player[] = [
  { id: 1, slot: 1, name: 'Sami' },
  { id: 2, slot: 2, name: 'Friend' },
];

let nextId = 1;
function result(playerId: number, game: StoredResult['game'], date: string, v: Partial<StoredResult>): StoredResult {
  return {
    id: nextId++, playerId, game, puzzleDate: date, puzzleNumber: null,
    seconds: null, guesses: null, hints: null, solved: true, raw: '', ...v,
  };
}

describe('formatting', () => {
  it('pads seconds', () => {
    expect(formatTime(42)).toBe('0:42');
    expect(formatTime(83)).toBe('1:23');
    expect(formatTime(600)).toBe('10:00');
  });

  it('labels each game in its own units', () => {
    expect(formatScore(result(1, 'wordle', '2026-09-14', { guesses: 4 }))).toBe('4/6');
    expect(formatScore(result(1, 'wordle', '2026-09-14', { guesses: 7, solved: false }))).toBe('X/6');
    expect(formatScore(result(1, 'strands', '2026-09-14', { hints: 0 }))).toBe('no hints');
    expect(formatScore(result(1, 'strands', '2026-09-14', { hints: 1 }))).toBe('1 hint');
    expect(formatScore(result(1, 'pinpoint', '2026-09-14', { guesses: 1 }))).toBe('1 guess');
    expect(formatScore(result(1, 'queens', '2026-09-14', { seconds: 42 }))).toBe('0:42');
  });
});

describe('outcome', () => {
  const fast = result(1, 'queens', '2026-09-14', { seconds: 30 });
  const slow = result(2, 'queens', '2026-09-14', { seconds: 90 });

  it('gives the win to the lower number', () => {
    expect(outcome(fast, slow)).toBe('p1');
    expect(outcome(slow, fast)).toBe('p2');
  });

  it('calls equal scores a tie', () => {
    expect(outcome(fast, result(2, 'queens', '2026-09-14', { seconds: 30 }))).toBe('tie');
  });

  it('treats a missing result as a forfeit', () => {
    expect(outcome(fast, undefined)).toBe('p1');
    expect(outcome(undefined, slow)).toBe('p2');
    expect(outcome(undefined, undefined)).toBe('none');
  });

  it('ranks a failed wordle below a solved one', () => {
    const failed = result(2, 'wordle', '2026-09-14', { guesses: 7, solved: false });
    const solved = result(1, 'wordle', '2026-09-14', { guesses: 6 });
    expect(outcome(solved, failed)).toBe('p1');
  });
});

describe('standings', () => {
  const results: StoredResult[] = [
    result(1, 'queens', '2026-09-14', { seconds: 30 }),
    result(2, 'queens', '2026-09-14', { seconds: 60 }),
    result(1, 'wordle', '2026-09-14', { guesses: 5 }),
    result(2, 'wordle', '2026-09-14', { guesses: 3 }),
    result(1, 'zip', '2026-09-14', { seconds: 20 }),
    result(2, 'zip', '2026-09-14', { seconds: 25 }),
  ];

  it('awards the day to whoever won more games', () => {
    const s = buildStandings(players, results, '2026-09-14');
    expect(s.days[0]).toMatchObject({ aWins: 2, bWins: 1, winner: 'p1' });
    expect(s.daysWon).toMatchObject({ a: 1, b: 0, tied: 0 });
    expect(s.gamesWon).toMatchObject({ a: 2, b: 1 });
  });

  it('tracks bests per game', () => {
    const s = buildStandings(players, results, '2026-09-14');
    expect(s.perGame.queens).toMatchObject({ a: 1, b: 0, played: 1, aBest: 30, bBest: 60 });
  });

  it('only counts a head to head when both players played', () => {
    const s = buildStandings(players, [result(1, 'tango', '2026-09-14', { seconds: 10 })], '2026-09-14');
    expect(s.perGame.tango.played).toBe(0);
    expect(s.days[0]?.winner).toBe('tie');
  });
});

describe('streaks', () => {
  const play = (dates: string[]) => dates.map((d) => result(1, 'wordle', d, { guesses: 4 }));

  it('counts back from today', () => {
    const s = streakFor(play(['2026-09-12', '2026-09-13', '2026-09-14']), 1, '2026-09-14');
    expect(s.current).toBe(3);
  });

  it('survives the morning before anyone has played', () => {
    const s = streakFor(play(['2026-09-12', '2026-09-13']), 1, '2026-09-14');
    expect(s.current).toBe(2);
  });

  it('breaks after a missed day', () => {
    const s = streakFor(play(['2026-09-10', '2026-09-11']), 1, '2026-09-14');
    expect(s.current).toBe(0);
    expect(s.longest).toBe(2);
  });

  it('remembers the longest run even after it breaks', () => {
    const s = streakFor(play(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10']), 1, '2026-09-10');
    expect(s).toMatchObject({ current: 1, longest: 3 });
  });
});

describe('date maths', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});
