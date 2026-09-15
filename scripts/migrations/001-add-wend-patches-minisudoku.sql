-- Adds Wend, Patches and Mini Sudoku to the allowed games.
-- The old constraint has to go before the new one lands, otherwise rows would
-- still have to satisfy both and the new ids would keep being rejected.

alter table results drop constraint results_game_check;

alter table results add constraint results_game_check
  check (game in ('wordle','strands','queens','tango','zip','wend','patches','minisudoku','pinpoint','crossclimb'));
