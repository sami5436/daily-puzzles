import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fail, loadState } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return fail(res, 405, 'GET only');
  try {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(await loadState());
  } catch (err) {
    console.error('state failed', err);
    return fail(res, 500, 'could not load the board');
  }
}
