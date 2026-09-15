import type { GameId, ParsedResult } from './types';

/**
 * Parses puzzle share text into structured results.
 *
 * The share formats are not documented anywhere and vary between platforms, so
 * every matcher here is deliberately loose: it anchors on the game name and the
 * numbers that follow, and ignores emoji grids, trailing links and marketing
 * lines. Anything it cannot read with confidence is skipped rather than guessed,
 * because a wrong score logged silently is worse than a missing one.
 */

const GAME_LINE =
  /^\s*[^A-Za-z]{0,4}(wordle|strands|queens|tango|zip|pinpoint|crossclimb)\b/i;

/** Matches "4:07", "0:42" and "1:02:33". Returns total seconds. */
const TIME = /(?:(\d{1,2}):)?(\d{1,3}):(\d{2})/;

const num = (s: string) => Number.parseInt(s.replace(/[,.\s]/g, ''), 10);

function toSeconds(m: RegExpMatchArray): number {
  const [, h, a, b] = m;
  return h
    ? num(h) * 3600 + num(a!) * 60 + num(b!)
    : num(a!) * 60 + num(b!);
}

function blank(): Omit<ParsedResult, 'game' | 'raw'> {
  return {
    puzzleNumber: null,
    seconds: null,
    guesses: null,
    hints: null,
    solved: true,
  };
}

/**
 * Strands reports hints as light bulbs inside the emoji grid that follows the
 * header, so it needs the lines after the header, not just the header itself.
 */
function strandsBlock(lines: string[], start: number): string[] {
  const block: string[] = [];
  for (let i = start + 1; i < lines.length && block.length < 10; i++) {
    const line = lines[i]!;
    if (GAME_LINE.test(line)) break;
    if (/[A-Za-z]{3}/.test(line) && !/^\s*["“]/.test(line)) break;
    block.push(line);
  }
  return block;
}

export function parseShareText(input: string): ParsedResult[] {
  const lines = input.split(/\r?\n/);
  const out: ParsedResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const header = GAME_LINE.exec(line);
    if (!header) continue;

    const game = header[1]!.toLowerCase() as GameId;
    // LinkedIn sometimes wraps the time onto the next line. Give every matcher
    // the header plus one line of lookahead so those still resolve.
    const scope = `${line} ${lines[i + 1] ?? ''}`;
    const result: ParsedResult = { game, raw: line.trim(), ...blank() };

    switch (game) {
      case 'wordle': {
        const m = /wordle\s+([\d,]+)\s+([1-6X])\s*\/\s*6/i.exec(line);
        if (!m) continue;
        result.puzzleNumber = num(m[1]!);
        if (m[2]!.toUpperCase() === 'X') {
          result.solved = false;
          result.guesses = 7; // ranks below every real score
        } else {
          result.guesses = num(m[2]!);
        }
        break;
      }

      case 'strands': {
        const m = /strands\s*#?\s*([\d,]+)/i.exec(line);
        if (!m) continue;
        result.puzzleNumber = num(m[1]!);
        const block = strandsBlock(lines, i).join('');
        result.hints = (block.match(/\u{1F4A1}/gu) ?? []).length;
        result.raw = [line, ...strandsBlock(lines, i)].join('\n').trim();
        break;
      }

      case 'pinpoint': {
        const m = /pinpoint\s*#?\s*([\d,]+)/i.exec(line);
        if (!m) continue;
        result.puzzleNumber = num(m[1]!);
        const g = /\|\s*(\d+)\s*guess/i.exec(scope) ?? /(\d+)\s*guess/i.exec(scope);
        if (!g) continue;
        result.guesses = num(g[1]!);
        break;
      }

      // Queens, Tango, Zip and Crossclimb all report a clock.
      default: {
        const m = new RegExp(`${game}\\s*#?\\s*([\\d,]+)`, 'i').exec(line);
        if (m) result.puzzleNumber = num(m[1]!);
        // Strip the puzzle number before hunting for a time, so "#123" cannot
        // be misread as part of the clock.
        const afterNumber = scope.replace(
          new RegExp(`${game}\\s*#?\\s*[\\d,]+`, 'i'),
          ' ',
        );
        const t = TIME.exec(afterNumber);
        if (!t) continue;
        result.seconds = toSeconds(t);
        break;
      }
    }

    out.push(result);
  }

  return out;
}

/**
 * One paste normally covers a single day, and people often send the same result
 * twice. Keep the first reading of each game and drop the rest.
 */
export function dedupeByGame(results: ParsedResult[]): ParsedResult[] {
  const seen = new Set<GameId>();
  return results.filter((r) => {
    if (seen.has(r.game)) return false;
    seen.add(r.game);
    return true;
  });
}
