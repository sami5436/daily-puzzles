# Daily Puzzles

A scoreboard for two people who play the same puzzles every day.

Paste the share text, it reads the scores, it keeps the record.

## Games

| Game | Source | Scored on |
| --- | --- | --- |
| Wordle | NYT | guesses |
| Strands | NYT | hints used |
| Queens | LinkedIn | time |
| Tango | LinkedIn | time |
| Zip | LinkedIn | time |
| Wend | LinkedIn | time |
| Patches | LinkedIn | time |
| Mini Sudoku | LinkedIn | time |
| Crossclimb | LinkedIn | time |
| Pinpoint | LinkedIn | guesses |

Every metric is lower is better, so one comparison rule covers all ten.
Each game is its own head to head, the winner takes a point, and whoever
wins more games wins the day.

## Stack

* Vite, React and TypeScript. No framework layer.
* Vercel Functions in `api/` for the backend.
* Neon Postgres for storage.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
npm run dev
```

`npm run dev` serves the front end only. For the API routes as well, use
`vercel dev`, which reads `.env.local` and runs `api/` alongside Vite.

```bash
npm test          # parser and scoring tests
npm run typecheck
npm run build
```

The schema lives in `scripts/schema.sql`, and changes to it since the first
deploy are in `scripts/migrations/`.

## The parser

`src/lib/parse.ts` reads share text. There is no published spec for any of
these formats, so every matcher anchors on the game name and the numbers
that follow, then ignores emoji grids, trailing links and marketing lines.
Anything it cannot read confidently is skipped rather than guessed, because
a wrong score stored silently is worse than a missing one.

The fixtures in `src/lib/parse.test.ts` record the assumed shape of each
format. When a real share string disagrees with one, correct the fixture
first, then the matcher.

## Data model

One row per player per game per day, unique on `(player_id, game, puzzle_date)`.
Saving upserts, so pasting the same day again corrects it instead of
duplicating it.
