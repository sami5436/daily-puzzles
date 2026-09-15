import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dedupeByGame, parseShareText } from '../src/lib/parse.js';
import { fail, sql, validDate, validEntry } from './_db.js';

/**
 * Accepts raw share text and logs whatever it can read.
 *
 * Built for an iOS Shortcut sitting in the share sheet, which can post a body
 * but cannot parse anything, so parsing happens here rather than on a client.
 * Replies in plain text because a Shortcut shows the response verbatim.
 *
 * iOS has no Web Share Target, so this endpoint plus a Shortcut is the closest
 * thing to sharing straight into the site on an iPhone.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'POST only');

  const text = readText(req);
  if (!text) return fail(res, 400, 'send the share text as the request body');

  const slot = readSlot(req);
  if (!slot) return fail(res, 400, 'add slot=1 or slot=2 to the URL');

  // The server runs in UTC, so a late night paste would land on tomorrow.
  // The caller should send its own local date; fall back only if it does not.
  const date = validDate(req.query.date) ?? new Date().toISOString().slice(0, 10);

  try {
    const parsed = dedupeByGame(parseShareText(text));
    if (parsed.length === 0) {
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      return res.status(200).send('Nothing readable in that. Nothing was saved.');
    }

    const player = await sql`select id, name from players where slot = ${slot}`;
    const row = player[0];
    if (!row) return fail(res, 400, 'set the player names in the app first');

    const entries = parsed.map(validEntry).filter((e) => e !== null);

    for (const e of entries) {
      await sql`
        insert into results
          (player_id, game, puzzle_date, puzzle_number, seconds, guesses, hints, solved, raw)
        values
          (${row.id}, ${e.game}, ${date}, ${e.puzzleNumber}, ${e.seconds},
           ${e.guesses}, ${e.hints}, ${e.solved}, ${e.raw})
        on conflict (player_id, game, puzzle_date) do update set
          puzzle_number = excluded.puzzle_number,
          seconds       = excluded.seconds,
          guesses       = excluded.guesses,
          hints         = excluded.hints,
          solved        = excluded.solved,
          raw           = excluded.raw`;
    }

    const names = entries.map((e) => e.game).join(', ');
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.status(200).send(
      `Saved ${entries.length} for ${row.name} on ${date}: ${names}`,
    );
  } catch (err) {
    console.error('ingest failed', err);
    return fail(res, 500, 'could not save that');
  }
}

/** Shortcuts posts text/plain; a browser or curl may send JSON instead. */
function readText(req: VercelRequest): string | null {
  const body = req.body as unknown;
  const raw =
    typeof body === 'string'
      ? body
      : typeof body === 'object' && body !== null && typeof (body as { text?: unknown }).text === 'string'
        ? (body as { text: string }).text
        : null;
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.slice(0, 20_000) : null;
}

function readSlot(req: VercelRequest): 1 | 2 | null {
  const v = req.query.slot;
  const s = Array.isArray(v) ? v[0] : v;
  return s === '1' ? 1 : s === '2' ? 2 : null;
}
