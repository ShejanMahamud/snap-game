-- Migration: Security Update v2.0.0
-- Adds user management, session tracking, and rate limiting tables

-- User accounts table
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

-- User data key-value storage
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

-- Achievement/badge tracking
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

-- Add index on scores.pid for faster lookups
CREATE INDEX IF NOT EXISTS idx_pid ON scores (pid);

-- Migrate existing scores to users table
INSERT INTO users (pid, name, xp, coins, created, last_seen, ip_hash, country)
SELECT DISTINCT 
  pid,
  name,
  0 as xp,
  0 as coins,
  MIN(ts) as created,
  MAX(ts) as last_seen,
  NULL as ip_hash,
  country
FROM scores
WHERE pid NOT IN (SELECT pid FROM users)
GROUP BY pid
ON CONFLICT (pid) DO NOTHING;

-- Clean up old rate limit windows (older than 1 hour)
DELETE FROM rate_limits WHERE window < (strftime('%s', 'now') * 1000 - 3600000) / 60000;

-- Clean up expired sessions
DELETE FROM sessions WHERE expires < strftime('%s', 'now') * 1000;
