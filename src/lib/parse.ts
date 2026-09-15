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

/**
 * How each game names itself at the start of its share text. Some names are two
 * words, so the pattern cannot be derived from the game id.
 */
const NAME: Record<GameId, string> = {
  wordle: 'wordle',
  strands: 'strands',
  queens: 'queens',
  tango: 'tango',
  zip: 'zip',
  wend: 'wend',
  patches: 'patches',
  minisudoku: 'mini\\s*sudoku',
  crossclimb: 'crossclimb',
  pinpoint: 'pinpoint',
};

/** Up to four leading non-letters absorbs a stray emoji or bullet. */
const header = (id: GameId) => new RegExp(`^\\s*[^A-Za-z]{0,4}${NAME[id]}\\b`, 'i');

/** The game name followed by its puzzle number. */
const numbered = (id: GameId) => new RegExp(`${NAME[id]}\\s*#?\\s*([\\d,]+)`, 'i');

const HEADERS = (Object.keys(NAME) as GameId[]).map((id) => ({ id, re: header(id) }));

/** Matches "4:07", "0:42" and "1:02:33". */
const TIME = /(?:(\d{1,2}):)?(\d{1,3}):(\d{2})/;

/** Wend and Patches both report hints as "with no hints" or "with 2 hints". */
const HINTS = /with\s+(no|\d+)\s+hints?/i;

const num = (s: string) => Number.parseInt(s.replace(/[,.\s]/g, ''), 10);

function toSeconds(m: RegExpMatchArray): number {
  const [, h, a, b] = m;
  return h ? num(h) * 3600 + num(a!) * 60 + num(b!) : num(a!) * 60 + num(b!);
}

function blank(): Omit<ParsedResult, 'game' | 'raw'> {
  return { puzzleNumber: null, seconds: null, guesses: null, hints: null, solved: true };
}

function matchGame(line: string): GameId | null {
  return HEADERS.find((h) => h.re.test(line))?.id ?? null;
}

/**
 * Strands reports hints as light bulbs inside the emoji grid that follows the
 * header, so it needs the lines after the header, not just the header itself.
 */
function strandsBlock(lines: string[], start: number): string[] {
  const block: string[] = [];
  for (let i = start + 1; i < lines.length && block.length < 10; i++) {
    const line = lines[i]!;
    if (matchGame(line)) break;
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
    const game = matchGame(line);
    if (!game) continue;

    // Some shares wrap the time or the hint count onto the next line, so give
    // every matcher one line of lookahead. Never look past a line that starts
    // another game, or a header with no score of its own would steal the next
    // game's clock and store it as a real result.
    const next = lines[i + 1] ?? '';
    const scope = matchGame(next) ? line : `${line} ${next}`;
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
        const m = numbered('strands').exec(line);
        if (!m) continue;
        result.puzzleNumber = num(m[1]!);
        const block = strandsBlock(lines, i);
        result.hints = (block.join('').match(/\u{1F4A1}/gu) ?? []).length;
        result.raw = [line, ...block].join('\n').trim();
        break;
      }

      case 'pinpoint': {
        const m = numbered('pinpoint').exec(line);
        if (!m) continue;
        result.puzzleNumber = num(m[1]!);
        const g = /(\d+)\s*guess/i.exec(scope);
        if (!g) continue;
        result.guesses = num(g[1]!);
        break;
      }

      // Queens, Tango, Zip, Wend, Patches, Mini Sudoku and Crossclimb all
      // report a clock.
      default: {
        const m = numbered(game).exec(line);
        if (m) result.puzzleNumber = num(m[1]!);
        // Strip the game name and puzzle number before hunting for a time, so
        // "#123" cannot be misread as part of the clock.
        const afterNumber = scope.replace(numbered(game), ' ');
        const t = TIME.exec(afterNumber);
        if (!t) continue;
        result.seconds = toSeconds(t);
        // Wend and Patches also say how many hints were taken. Record it, but
        // keep the clock as the metric: no sample of a hinted solve exists yet,
        // so how it should weigh against a clean one is still unknown.
        const h = HINTS.exec(scope);
        if (h) result.hints = h[1]!.toLowerCase() === 'no' ? 0 : num(h[1]!);
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
