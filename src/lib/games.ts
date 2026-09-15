import type { GameId, Metric } from './types';

export interface GameMeta {
  id: GameId;
  label: string;
  metric: Metric;
  /** Where the puzzle comes from, shown as a quiet subtitle. */
  source: 'NYT' | 'LinkedIn';
}

export const GAMES: GameMeta[] = [
  { id: 'wordle', label: 'Wordle', metric: 'guesses', source: 'NYT' },
  { id: 'strands', label: 'Strands', metric: 'hints', source: 'NYT' },
  { id: 'queens', label: 'Queens', metric: 'time', source: 'LinkedIn' },
  { id: 'tango', label: 'Tango', metric: 'time', source: 'LinkedIn' },
  { id: 'zip', label: 'Zip', metric: 'time', source: 'LinkedIn' },
  { id: 'wend', label: 'Wend', metric: 'time', source: 'LinkedIn' },
  { id: 'patches', label: 'Patches', metric: 'time', source: 'LinkedIn' },
  { id: 'minisudoku', label: 'Mini Sudoku', metric: 'time', source: 'LinkedIn' },
  { id: 'crossclimb', label: 'Crossclimb', metric: 'time', source: 'LinkedIn' },
  { id: 'pinpoint', label: 'Pinpoint', metric: 'guesses', source: 'LinkedIn' },
];

export const GAME_IDS: GameId[] = GAMES.map((g) => g.id);

const BY_ID = new Map<GameId, GameMeta>(GAMES.map((g) => [g.id, g]));

export function gameMeta(id: GameId): GameMeta {
  const meta = BY_ID.get(id);
  if (!meta) throw new Error(`unknown game: ${id}`);
  return meta;
}
