import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fail, loadState, sql } from './_db';

/** Sets both player names. Two slots, no accounts, no login. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return fail(res, 405, 'POST only');

  const names = (req.body as { names?: unknown })?.names;
  if (!Array.isArray(names) || names.length !== 2) {
    return fail(res, 400, 'send exactly two names');
  }

  const clean = names.map((n) => (typeof n === 'string' ? n.trim().slice(0, 40) : ''));
  if (clean.some((n) => n.length === 0)) return fail(res, 400, 'both names are required');

  try {
    for (const [i, name] of clean.entries()) {
      await sql`
        insert into players (slot, name) values (${i + 1}, ${name})
        on conflict (slot) do update set name = excluded.name`;
    }
    return res.status(200).json(await loadState());
  } catch (err) {
    console.error('players failed', err);
    return fail(res, 500, 'could not save names');
  }
}
