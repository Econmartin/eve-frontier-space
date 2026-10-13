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
