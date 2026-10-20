-- Initial SNAP database tables. Later migrations add the country and user fields.
CREATE TABLE IF NOT EXISTS scores (
  board TEXT NOT NULL,
  pid   TEXT NOT NULL,
  name  TEXT NOT NULL,
  score INTEGER NOT NULL,
  ts    INTEGER NOT NULL,
  PRIMARY KEY (board, pid)
);

CREATE INDEX IF NOT EXISTS idx_board_score ON scores (board, score DESC);

CREATE TABLE IF NOT EXISTS stage_seeds (
  stage_num INTEGER PRIMARY KEY,
  seed      INTEGER NOT NULL,
  rotated   INTEGER NOT NULL
);
