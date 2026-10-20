-- Leaderboard scores
CREATE TABLE IF NOT EXISTS scores (
  board   TEXT NOT NULL,
  pid     TEXT NOT NULL,
  name    TEXT NOT NULL,
  score   INTEGER NOT NULL,
  ts      INTEGER NOT NULL,
  country TEXT,
  PRIMARY KEY (board, pid)
);
CREATE INDEX IF NOT EXISTS idx_board_score ON scores (board, score DESC);
CREATE INDEX IF NOT EXISTS idx_pid ON scores (pid);

-- User progression (server-side)
CREATE TABLE IF NOT EXISTS users (
  pid       TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  xp        INTEGER DEFAULT 0,
  coins     INTEGER DEFAULT 0,
  created   INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  ip_hash   TEXT,
  country   TEXT
);

-- User unlocks and purchases
CREATE TABLE IF NOT EXISTS user_data (
  pid   TEXT NOT NULL,
  key   TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (pid, key)
);

-- Game sessions for anti-cheat
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  pid        TEXT NOT NULL,
  mode       TEXT NOT NULL,
  seed       INTEGER NOT NULL,
  started    INTEGER NOT NULL,
  expires    INTEGER NOT NULL,
  ip_hash    TEXT
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT NOT NULL,
  action     TEXT NOT NULL,
  count      INTEGER NOT NULL,
  window     INTEGER NOT NULL,
  PRIMARY KEY (identifier, action, window)
);

-- Achievement/badge tracking (server-side)
CREATE TABLE IF NOT EXISTS user_stats (
  pid     TEXT PRIMARY KEY,
  gems    INTEGER DEFAULT 0,
  gold    INTEGER DEFAULT 0,
  mys     INTEGER DEFAULT 0,
  fever   INTEGER DEFAULT 0,
  rounds  INTEGER DEFAULT 0,
  snap    INTEGER DEFAULT 0,
  combo   INTEGER DEFAULT 0,
  best    INTEGER DEFAULT 0,
  updated INTEGER NOT NULL
);

-- Stage seed rotation (server-side)
CREATE TABLE IF NOT EXISTS stage_seeds (
  stage_num INTEGER PRIMARY KEY,
  seed      INTEGER NOT NULL,
  rotated   INTEGER NOT NULL  -- Timestamp of last rotation
);
