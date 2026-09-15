import { gameMeta } from './games';
import { formatScore } from './score';
import type { DayRow, Standings } from './score';
import type { Player } from './types';

/**
 * Draws the day as a PNG for sending in a message.
 *
 * Always renders in the light palette. The card is read inside someone else's
 * chat thread, not inside the app, so it should not follow the sender's theme.
 */

const W = 1080;
const H = 1350;
const M = 84;

const INK = '#191817';
const MUTED = '#75726d';
const FAINT = '#a5a19b';
const BG = '#faf9f7';
const RULE = '#d2cec6';
const HAIR = '#e5e2dc';
const P1 = '#2b6cb0';
const P2 = '#b8622c';

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const font = (size: number, weight = 400) => `${weight} ${size}px ${SANS}`;

/** The four square logo, same arrangement as the favicon and the app header. */
function mark(c: CanvasRenderingContext2D, x: number, y: number, q: number, gap: number) {
  const colours = [INK, P1, P2, INK];
  colours.forEach((colour, i) => {
    c.fillStyle = colour;
    c.fillRect(x + (i % 2) * (q + gap), y + Math.floor(i / 2) * (q + gap), q, q);
  });
}

function rule(c: CanvasRenderingContext2D, y: number, colour = RULE, width = 2) {
  c.strokeStyle = colour;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(M, y);
  c.lineTo(W - M, y);
  c.stroke();
}

export interface ShareCardInput {
  p1: Player;
  p2: Player;
  row: DayRow | undefined;
  standings: Standings;
  dateLabel: string;
}

export function drawShareCard(canvas: HTMLCanvasElement, input: ShareCardInput): void {
  const { p1, p2, row, standings, dateLabel } = input;
  canvas.width = W;
  canvas.height = H;

  const c = canvas.getContext('2d');
  if (!c) throw new Error('canvas is unavailable');

  c.fillStyle = BG;
  c.fillRect(0, 0, W, H);
  c.textBaseline = 'alphabetic';

  mark(c, M, 56, 26, 7);

  c.fillStyle = INK;
  c.font = font(58, 600);
  c.textAlign = 'left';
  c.fillText('Daily Puzzles', M, 212);

  c.fillStyle = MUTED;
  c.font = font(30);
  c.fillText(dateLabel, M, 258);

  rule(c, 300);

  // Column headers. Names are right aligned over their score column.
  const col1 = W - M - 230;
  const col2 = W - M;

  c.font = font(26, 600);
  c.textAlign = 'right';
  c.fillStyle = P1;
  c.fillText(p1.name.toUpperCase(), col1, 356);
  c.fillStyle = P2;
  c.fillText(p2.name.toUpperCase(), col2, 356);

  const games = row?.games ?? [];

  if (games.length === 0) {
    c.textAlign = 'left';
    c.fillStyle = MUTED;
    c.font = font(32);
    c.fillText('Nothing logged yet.', M, 448);
  }

  let y = 416;
  const step = 62;

  for (const g of games) {
    rule(c, y - 34, HAIR, 1.5);

    c.textAlign = 'left';
    c.fillStyle = INK;
    c.font = font(32, 500);
    c.fillText(gameMeta(g.game).label, M, y);

    c.textAlign = 'right';
    c.font = font(32, g.outcome === 'p1' ? 600 : 400);
    c.fillStyle = g.a ? (g.outcome === 'p1' ? P1 : MUTED) : FAINT;
    c.fillText(g.a ? formatScore(g.a) : '·', col1, y);

    c.font = font(32, g.outcome === 'p2' ? 600 : 400);
    c.fillStyle = g.b ? (g.outcome === 'p2' ? P2 : MUTED) : FAINT;
    c.fillText(g.b ? formatScore(g.b) : '·', col2, y);

    y += step;
  }

  // Footer: the day's result, then the running record and streaks.
  const footTop = Math.max(y + 24, H - 300);
  rule(c, footTop);

  c.textAlign = 'left';
  c.fillStyle = INK;
  c.font = font(40, 600);

  let verdict = 'No games in common yet';
  if (row && row.games.length > 0) {
    if (row.winner === 'tie') verdict = `Level, ${row.aWins} each`;
    else {
      const name = row.winner === 'p1' ? p1.name : p2.name;
      const hi = Math.max(row.aWins, row.bWins);
      const lo = Math.min(row.aWins, row.bWins);
      verdict = `${name} takes the day, ${hi} to ${lo}`;
    }
  }
  c.fillText(verdict, M, footTop + 62);

  c.fillStyle = MUTED;
  c.font = font(28);
  const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
  c.fillText(
    `${p1.name} ${days(standings.daysWon.a)}  ·  ${p2.name} ${days(standings.daysWon.b)}`,
    M,
    footTop + 112,
  );
  c.fillText(
    `Streaks: ${p1.name} ${standings.streak.a.current}, ${p2.name} ${standings.streak.b.current}`,
    M,
    footTop + 156,
  );

  c.fillStyle = FAINT;
  c.font = font(24);
  c.fillText('daily-puzzles-psi.vercel.app', M, H - 56);
}

export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('could not render the card'))),
      'image/png',
    );
  });
}
