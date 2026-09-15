import { describe, expect, it } from 'vitest';
import { dedupeByGame, parseShareText } from './parse';

/**
 * These fixtures encode what each share format is believed to look like. They
 * are the place to correct the parser once real pasted text is available: fix
 * the fixture, then fix the matcher until it passes.
 */

describe('wordle', () => {
  it('reads the puzzle number and guess count', () => {
    const [r] = parseShareText('Wordle 1,562 4/6\n\n⬛\u{1f7e8}⬛⬛⬛');
    expect(r).toMatchObject({ game: 'wordle', puzzleNumber: 1562, guesses: 4, solved: true });
  });

  it('treats X/6 as a loss that ranks below every real score', () => {
    const [r] = parseShareText('Wordle 1562 X/6');
    expect(r).toMatchObject({ guesses: 7, solved: false });
  });

  it('tolerates the hard mode asterisk', () => {
    const [r] = parseShareText('Wordle 1562 3/6*');
    expect(r?.guesses).toBe(3);
  });
});

describe('strands', () => {
  it('counts light bulbs in the grid as hints', () => {
    const [r] = parseShareText(
      'Strands #567\n"Sounds fishy"\n\u{1f4a1}\u{1f535}\u{1f535}\u{1f7e1}\n\u{1f535}\u{1f4a1}\u{1f535}',
    );
    expect(r).toMatchObject({ game: 'strands', puzzleNumber: 567, hints: 2 });
  });

  it('records zero hints for a clean solve', () => {
    const [r] = parseShareText('Strands #567\n\u{1f7e1}\u{1f535}\u{1f535}\u{1f535}');
    expect(r?.hints).toBe(0);
  });
});

describe('linkedin timed games', () => {
  it.each([
    ['Queens #123 | 0:42', 'queens', 123, 42],
    ['Tango #45 | 1:23', 'tango', 45, 83],
    ['Zip #89 | 0:31 \u{1f3c1}', 'zip', 89, 31],
    ['Crossclimb #210 | 2:05', 'crossclimb', 210, 125],
  ])('reads %s', (text, game, puzzle, seconds) => {
    const [r] = parseShareText(text);
    expect(r).toMatchObject({ game, puzzleNumber: puzzle, seconds });
  });

  it('ignores trailing marketing lines', () => {
    const [r] = parseShareText(
      'Queens #123 | 0:42\nFirst \u{1f451}s: row 3\nlnkd.in/queens\nPlay now',
    );
    expect(r?.seconds).toBe(42);
  });

  it('does not mistake the puzzle number for a clock', () => {
    const [r] = parseShareText('Zip #1234 | 0:31');
    expect(r).toMatchObject({ puzzleNumber: 1234, seconds: 31 });
  });
});

describe('pinpoint', () => {
  it('reads guesses rather than a time', () => {
    const [r] = parseShareText('Pinpoint #123 | 3 guesses');
    expect(r).toMatchObject({ game: 'pinpoint', puzzleNumber: 123, guesses: 3, seconds: null });
  });

  it('handles the singular form', () => {
    const [r] = parseShareText('Pinpoint #123 | 1 guess');
    expect(r?.guesses).toBe(1);
  });
});

describe('wend, patches and mini sudoku', () => {
  // These three are verbatim from real shares.
  const WEND = 'Wend #98 | 0:46 \u{1f300}\nWith no hints\n\u{1f3c5} I started a new streak today!\nlnkd.in/wend';
  const PATCHES = 'Patches #181 | 0:28 \u{1f9f6}\nWith no hints & 5 redraws\nlnkd.in/patches';
  const SUDOKU = 'Mini Sudoku #399 | 0:55 and flawless \u270f\ufe0f\nThe classic game, made mini. Handcrafted by the originators of \u201cSudoku.\u201d\nlnkd.in/minisudoku';

  it('reads Wend as a clock and records the hint count', () => {
    const [r] = parseShareText(WEND);
    expect(r).toMatchObject({ game: 'wend', puzzleNumber: 98, seconds: 46, hints: 0 });
  });

  it('reads Patches despite the redraw count sharing the hints line', () => {
    const [r] = parseShareText(PATCHES);
    expect(r).toMatchObject({ game: 'patches', puzzleNumber: 181, seconds: 28, hints: 0 });
  });

  it('reads Mini Sudoku, whose name is two words', () => {
    const [r] = parseShareText(SUDOKU);
    expect(r).toMatchObject({ game: 'minisudoku', puzzleNumber: 399, seconds: 55 });
  });

  it('is not fooled by the marketing line that follows Mini Sudoku', () => {
    expect(parseShareText(SUDOKU)).toHaveLength(1);
  });

  it('counts hints when some were taken', () => {
    const [r] = parseShareText('Wend #98 | 1:12 \u{1f300}\nWith 2 hints');
    expect(r).toMatchObject({ seconds: 72, hints: 2 });
  });

  it('pulls all three out of one paste', () => {
    const games = parseShareText(`${WEND}\n\n${PATCHES}\n\n${SUDOKU}`).map((r) => r.game);
    expect(games).toEqual(['wend', 'patches', 'minisudoku']);
  });

  it('ignores the trailing lnkd.in lines', () => {
    expect(parseShareText('lnkd.in/wend\nlnkd.in/patches\nlnkd.in/minisudoku')).toEqual([]);
  });
});

describe('mixed pastes', () => {
  const thread = `
Wordle 1,562 4/6

⬛\u{1f7e8}⬛⬛⬛
\u{1f7e9}\u{1f7e9}\u{1f7e9}\u{1f7e9}\u{1f7e9}

Strands #567
"Sounds fishy"
\u{1f4a1}\u{1f535}\u{1f535}\u{1f7e1}

Queens #123 | 0:42
lnkd.in/queens

Pinpoint #123 | 2 guesses
`;

  it('pulls every game out of one blob', () => {
    const games = parseShareText(thread).map((r) => r.game);
    expect(games).toEqual(['wordle', 'strands', 'queens', 'pinpoint']);
  });

  it('skips text with nothing to read', () => {
    expect(parseShareText('hey are you playing today')).toEqual([]);
  });

  it('skips a game header with no score attached', () => {
    expect(parseShareText('Queens was brutal today')).toEqual([]);
  });

  it('keeps the first reading when a game repeats', () => {
    const parsed = parseShareText('Queens #123 | 0:42\nQueens #123 | 1:10');
    expect(parsed).toHaveLength(2);
    expect(dedupeByGame(parsed)).toHaveLength(1);
    expect(dedupeByGame(parsed)[0]?.seconds).toBe(42);
  });
});
