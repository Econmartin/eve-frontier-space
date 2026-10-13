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
