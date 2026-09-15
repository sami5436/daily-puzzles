-- Daily Puzzles schema (Neon Postgres)

create table if not exists players (
  id         serial primary key,
  slot       int not null unique check (slot in (1, 2)),
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists results (
  id            serial primary key,
  player_id     int  not null references players(id) on delete cascade,
  game          text not null check (game in
                   ('wordle','strands','queens','tango','zip','wend','patches','minisudoku','pinpoint','crossclimb')),
  puzzle_date   date not null,
  puzzle_number int,
  seconds       int,      -- timed games: queens, tango, zip, wend, patches,
                          --              minisudoku, crossclimb
  guesses       int,      -- wordle (1..6, 7 = failed), pinpoint (1..5)
  hints         int,      -- strands
  solved        boolean not null default true,
  raw           text not null default '',
  created_at    timestamptz not null default now(),
  unique (player_id, game, puzzle_date)
);

create index if not exists results_date_idx on results (puzzle_date desc);
create index if not exists results_game_idx on results (game, puzzle_date desc);
