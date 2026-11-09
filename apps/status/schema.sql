-- EVE Frontier status monitor (D1: eve-frontier-status, bound as STATUS_DB). Apply with:
--   npm run db:local -w @eve-frontier-space/status     (local wrangler dev)
--   npm run db:remote -w @eve-frontier-space/status    (production)
-- Safe to re-run.

-- One row per component per cron run (every minute). Kept 14 days.
CREATE TABLE IF NOT EXISTS samples (
  component  TEXT    NOT NULL,
  ts         INTEGER NOT NULL,           -- epoch ms
  status     TEXT    NOT NULL,           -- operational | degraded | offline | maintenance | unknown
  latency_ms INTEGER,
  message    TEXT    NOT NULL,
  detail     TEXT,                       -- JSON, check-specific
  PRIMARY KEY (component, ts)
) WITHOUT ROWID;

-- Minutes per status per component per UTC day. Incremented every run, reconciled from samples once a day. Kept 400 days.
CREATE TABLE IF NOT EXISTS rollups (
  component   TEXT    NOT NULL,
  day         TEXT    NOT NULL,          -- YYYY-MM-DD
  operational INTEGER NOT NULL DEFAULT 0,
  degraded    INTEGER NOT NULL DEFAULT 0,
  offline     INTEGER NOT NULL DEFAULT 0,
  maintenance INTEGER NOT NULL DEFAULT 0,
  unknown     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (component, day)
) WITHOUT ROWID;

-- Per component per UTC hour: minutes at each status, latency, and the newest message at each problem level. Incremented
-- every run; feeds the 24-hour overview and the 7-day component view without reading raw samples. Kept 8 days.
-- The cron also creates and fills this table on its first run if it is missing (worker/hourly.ts, same definition).
CREATE TABLE IF NOT EXISTS hourly (
  component       TEXT    NOT NULL,
  hour            INTEGER NOT NULL,      -- epoch ms of the hour's start
  operational     INTEGER NOT NULL DEFAULT 0,
  degraded        INTEGER NOT NULL DEFAULT 0,
  offline         INTEGER NOT NULL DEFAULT 0,
  maintenance     INTEGER NOT NULL DEFAULT 0,
  unknown         INTEGER NOT NULL DEFAULT 0,
  lat_sum         INTEGER NOT NULL DEFAULT 0,
  lat_n           INTEGER NOT NULL DEFAULT 0,
  msg_degraded    TEXT,
  msg_offline     TEXT,
  msg_maintenance TEXT,
  msg_unknown     TEXT,
  PRIMARY KEY (component, hour)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS incidents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  component   TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  impact      TEXT    NOT NULL,          -- worst level seen: degraded | offline
  status      TEXT    NOT NULL,          -- open | resolved
  started_at  INTEGER NOT NULL,
  resolved_at INTEGER,
  automatic   INTEGER NOT NULL DEFAULT 1 -- 0 = opened by an admin; never closed automatically
);
CREATE INDEX IF NOT EXISTS incidents_status ON incidents (status, started_at);

CREATE TABLE IF NOT EXISTS incident_updates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL,
  ts          INTEGER NOT NULL,
  kind        TEXT    NOT NULL,          -- detected | update | impact | resolved
  author      TEXT    NOT NULL,          -- monitor | admin
  body        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS incident_updates_incident ON incident_updates (incident_id, ts);

-- World redeploys and upgrades found in Published.toml.
CREATE TABLE IF NOT EXISTS events (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts     INTEGER NOT NULL,
  tenant TEXT    NOT NULL,
  kind   TEXT    NOT NULL,               -- world_redeployed | world_upgraded
  body   TEXT    NOT NULL,
  detail TEXT
);

-- Cursors, resolved packages, backoff state. Small JSON values by key.
CREATE TABLE IF NOT EXISTS meta (
  key        TEXT PRIMARY KEY,
  value      TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
) WITHOUT ROWID;

-- Every gap between consecutive sponsored world transactions, as a histogram per world per day (see worker/gaps.ts).
CREATE TABLE IF NOT EXISTS gap_hist (
  tenant  TEXT    NOT NULL,
  day     TEXT    NOT NULL,
  buckets TEXT    NOT NULL,              -- JSON array of counts, one per bucket in GAP_EDGES
  n       INTEGER NOT NULL,
  max_gap REAL    NOT NULL,
  PRIMARY KEY (tenant, day)
) WITHOUT ROWID;

-- Webhook subscribers and their pending deliveries.
CREATE TABLE IF NOT EXISTS subscribers (
  id         TEXT    PRIMARY KEY,
  url        TEXT    NOT NULL UNIQUE,
  secret     TEXT    NOT NULL,           -- signs deliveries (HMAC-SHA256 over timestamp.body) and authorises unsubscribe
  created_at INTEGER NOT NULL,
  ip_hash    TEXT,
  failures   INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS deliveries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  subscriber TEXT    NOT NULL,
  payload    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  next_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS deliveries_next ON deliveries (next_at);

-- Webhook sign-up attempts per (hashed) IP: each attempt sends a challenge, so failed ones are limited too.
CREATE TABLE IF NOT EXISTS subscribe_attempts (
  ip_hash TEXT    NOT NULL,
  ts      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS subscribe_attempts_ip ON subscribe_attempts (ip_hash, ts);
