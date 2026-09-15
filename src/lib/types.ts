export type GameId =
  | 'wordle'
  | 'strands'
  | 'queens'
  | 'tango'
  | 'zip'
  | 'pinpoint'
  | 'crossclimb';

/** How a game is scored. Every metric is lower-is-better. */
export type Metric = 'time' | 'guesses' | 'hints';

export interface ParsedResult {
  game: GameId;
  puzzleNumber: number | null;
  seconds: number | null;
  guesses: number | null;
  hints: number | null;
  solved: boolean;
  raw: string;
}

export interface StoredResult extends ParsedResult {
  id: number;
  playerId: number;
  puzzleDate: string; // YYYY-MM-DD
}

export interface Player {
  id: number;
  slot: 1 | 2;
  name: string;
}

export interface AppState {
  players: Player[];
  results: StoredResult[];
}
