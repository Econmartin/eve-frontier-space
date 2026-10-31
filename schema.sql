-- Community-submitted mining sessions (D1). Create with:
--   npx wrangler d1 create eve-frontier-mining
--   npx wrangler d1 execute eve-frontier-mining --file=schema.sql [--local]
CREATE TABLE IF NOT EXISTS mining_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  cycle       TEXT    NOT NULL,
  rock        TEXT    NOT NULL,
  prefix      TEXT,
  start_ts    TEXT    NOT NULL,
  end_ts      TEXT    NOT NULL,
  ticks       INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  materials   TEXT    NOT NULL,          -- JSON {regolithTypeID: units}
  ticks_json  TEXT,                       -- JSON [[unixSeconds, units, regolithTypeID], …] as logged, after checks
  submitter   TEXT                        -- salted hash of the client IP, for rate limiting only
);
CREATE INDEX IF NOT EXISTS mining_sessions_rock ON mining_sessions (cycle, rock);

-- Share cards: a rendered picture of one rock plus the numbers to rebuild it, behind /rocks/<id>
CREATE TABLE IF NOT EXISTS rock_cards (
  id          TEXT    PRIMARY KEY,          -- short random id used in the share URL
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  meta        TEXT    NOT NULL,             -- JSON {rock, prefix, units, voxels, ticks, start, end, seed, materials:{regolithTypeID: units}}
  image       BLOB    NOT NULL,             -- 1200x630 JPEG for Open Graph unfurls
  submitter   TEXT                          -- salted hash of the client IP, for rate limiting only
);

-- Raw mining data from every log file that passed the checks, one row per game session, for analysis.
-- Only the mining ticks are kept: [[unixSeconds, units, regolithTypeID], …]. No names, nothing else from the log.
CREATE TABLE IF NOT EXISTS mining_logs (
  id             TEXT    PRIMARY KEY,       -- sha-256 of the tick list, so the same file is stored once
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  cycle          TEXT    NOT NULL,
  session_start  TEXT    NOT NULL,          -- "Session Started" from the file header
  first_tick     TEXT    NOT NULL,
  last_tick      TEXT    NOT NULL,
  ticks          INTEGER NOT NULL,
  units          INTEGER NOT NULL,
  ticks_json     TEXT    NOT NULL,
  submitter      TEXT                        -- salted hash of the client IP, for rate limiting only
);
CREATE INDEX IF NOT EXISTS mining_logs_session ON mining_logs (cycle, session_start);

-- Game-derived assets for the industry pages (recipe dataset, item icons). They live here rather than in the
-- public repo; scripts/game-data/upload_assets.py fills the table and the worker serves it. Large assets are
-- split into parts because D1 caps the length of a single SQL statement.
CREATE TABLE IF NOT EXISTS game_assets (
  asset         TEXT    NOT NULL,            -- 'industry-data' or 'icon/<typeID>'
  part          INTEGER NOT NULL DEFAULT 0,
  content_type  TEXT    NOT NULL,
  body          BLOB    NOT NULL,
  PRIMARY KEY (asset, part)
);
