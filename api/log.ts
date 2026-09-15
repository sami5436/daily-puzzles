import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fail, loadState, sql, validDate, validEntry } from './_db.js';

/**
 * Saves a batch of parsed results for one player on one date.
 *
 * Re-pasting the same day overwrites rather than duplicating, so fixing a
 * mistake is just pasting again. DELETE removes a single row by id.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'DELETE') {
      const id = Number((req.query.id as string) ?? NaN);
      if (!Number.isInteger(id)) return fail(res, 400, 'bad id');
      await sql`delete from results where id = ${id}`;
      return res.status(200).json(await loadState());
    }

    if (req.method !== 'POST') return fail(res, 405, 'POST or DELETE only');

    const body = req.body as { slot?: unknown; date?: unknown; entries?: unknown };

    const slot = body.slot === 1 || body.slot === 2 ? body.slot : null;
    if (!slot) return fail(res, 400, 'slot must be 1 or 2');

    const date = validDate(body.date);
    if (!date) return fail(res, 400, 'date must be YYYY-MM-DD');

    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return fail(res, 400, 'nothing to save');
    }
    if (body.entries.length > 500) return fail(res, 400, 'too many entries at once');

    const entries = body.entries.map(validEntry).filter((e) => e !== null);
    if (entries.length === 0) return fail(res, 400, 'no readable results');

    const player = await sql`select id from players where slot = ${slot}`;
    const playerId = player[0]?.id;
    if (!playerId) return fail(res, 400, 'set player names first');

    for (const e of entries) {
      await sql`
        insert into results
          (player_id, game, puzzle_date, puzzle_number, seconds, guesses, hints, solved, raw)
        values
          (${playerId}, ${e.game}, ${date}, ${e.puzzleNumber}, ${e.seconds},
           ${e.guesses}, ${e.hints}, ${e.solved}, ${e.raw})
        on conflict (player_id, game, puzzle_date) do update set
          puzzle_number = excluded.puzzle_number,
          seconds       = excluded.seconds,
          guesses       = excluded.guesses,
          hints         = excluded.hints,
          solved        = excluded.solved,
          raw           = excluded.raw`;
    }

    return res.status(200).json(await loadState());
  } catch (err) {
    console.error('log failed', err);
    return fail(res, 500, 'could not save results');
  }
}
