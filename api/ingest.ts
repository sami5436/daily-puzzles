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
  if (req.method !== 'POST' && req.method !== 'GET') {
    return fail(res, 405, 'POST or GET only');
  }

  const text = await readText(req);
  if (!text) {
    // Say what actually turned up. Debugging a Shortcut is otherwise blind.
    const kind = Buffer.isBuffer(req.body) ? 'buffer' : typeof req.body;
    return fail(
      res,
      400,
      `no share text found. content-type was ${req.headers['content-type'] ?? 'unset'}, ` +
        `body arrived as ${kind}. Send the text as the request body, as JSON {"text": "..."}, ` +
        `or as a text= parameter on the URL.`,
    );
  }

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

/**
 * Pulls the share text out of the request however it was sent.
 *
 * Shortcuts can post a raw body, a JSON object or nothing at all with the text
 * on the URL, and it does not reliably set a content type. Vercel only fills
 * req.body for content types it recognises, so anything else has to be read off
 * the stream directly.
 */
async function readText(req: VercelRequest): Promise<string | null> {
  let raw: string | null = null;
  const body = req.body as unknown;

  if (Buffer.isBuffer(body)) raw = body.toString('utf8');
  else if (typeof body === 'string') raw = body;
  else if (typeof body === 'object' && body !== null) raw = pickText(body);

  // Nothing usable yet, so the body was never parsed for us. Read it raw.
  if (!raw || raw.trim().length === 0) {
    const streamed = await readStream(req);
    if (streamed.trim().length > 0) raw = streamed;
  }

  // A JSON body that arrived as an unparsed string.
  if (raw && raw.trimStart().startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        const inner = pickText(parsed);
        if (inner) raw = inner;
      }
    } catch {
      // Not JSON after all, so keep the string as it is.
    }
  }

  return clean(raw) ?? clean(first(req.query.text));
}

function pickText(body: object): string | null {
  const record = body as Record<string, unknown>;
  for (const key of ['text', 'Text', 'shareText', 'body', 'input']) {
    const v = record[key];
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  // A single string field under any name is unambiguous enough to use.
  const strings = Object.values(record).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  return strings.length === 1 ? strings[0]! : null;
}

function readStream(req: VercelRequest): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    let size = 0;
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      size += chunk.length;
      if (size <= 20_000) data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
    // A body already consumed upstream never emits, so do not hang on it.
    setTimeout(() => resolve(data), 1000);
  });
}

function first(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : null;
}

function clean(v: string | null): string | null {
  const trimmed = v?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.slice(0, 20_000) : null;
}

function readSlot(req: VercelRequest): 1 | 2 | null {
  const s = first(req.query.slot);
  return s === '1' ? 1 : s === '2' ? 2 : null;
}
