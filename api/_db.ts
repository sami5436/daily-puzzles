import { neon } from '@neondatabase/serverless';
import type { VercelResponse } from '@vercel/node';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

export const sql = neon(url);

export const GAME_IDS = [
  'wordle', 'strands', 'queens', 'tango', 'zip', 'pinpoint', 'crossclimb',
] as const;

export type GameId = (typeof GAME_IDS)[number];

export interface Entry {
  game: GameId;
  puzzleNumber: number | null;
  seconds: number | null;
  guesses: number | null;
  hints: number | null;
  solved: boolean;
  raw: string;
}

export function fail(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Bounded so a bad paste or a hostile caller cannot write nonsense. */
function bounded(v: unknown, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= 0 && n <= max ? n : null;
}

export function validEntry(raw: unknown): Entry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const e = raw as Record<string, unknown>;
  if (!GAME_IDS.includes(e.game as GameId)) return null;
  return {
    game: e.game as GameId,
    puzzleNumber: bounded(e.puzzleNumber, 100_000),
    seconds: bounded(e.seconds, 86_400),
    guesses: bounded(e.guesses, 20),
    hints: bounded(e.hints, 50),
    solved: e.solved !== false,
    raw: typeof e.raw === 'string' ? e.raw.slice(0, 500) : '',
  };
}

export function validDate(v: unknown): string | null {
  if (typeof v !== 'string' || !DATE.test(v)) return null;
  return Number.isNaN(Date.parse(v)) ? null : v;
}

export async function loadState() {
  const players = await sql`
    select id, slot, name from players order by slot`;
  const results = await sql`
    select id, player_id, game, to_char(puzzle_date, 'YYYY-MM-DD') as puzzle_date,
           puzzle_number, seconds, guesses, hints, solved, raw
    from results
    order by puzzle_date desc, game`;

  return {
    players: players.map((p) => ({ id: p.id, slot: p.slot, name: p.name })),
    results: results.map((r) => ({
      id: r.id,
      playerId: r.player_id,
      game: r.game,
      puzzleDate: r.puzzle_date,
      puzzleNumber: r.puzzle_number,
      seconds: r.seconds,
      guesses: r.guesses,
      hints: r.hints,
      solved: r.solved,
      raw: r.raw,
    })),
  };
}
