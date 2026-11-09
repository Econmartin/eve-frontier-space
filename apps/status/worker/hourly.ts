// Hourly rollups: per component per UTC hour, the minutes at each status, latency, and the newest message at each
// problem level. They feed the views that span many hours (the overview's 24 hours, a component's 7 days), which would
// otherwise aggregate thousands of raw samples on every poll. D1 bills every row a query reads, so that adds up fast.
import { LEVELS, type Level } from '../shared/status.ts';
import type { AggRow, ProblemRow } from './buckets.ts';
import type { CheckResult } from './checks/types.ts';

export const HOUR_MS = 3600_000;
export const hourOf = (ms: number) => Math.floor(ms / HOUR_MS) * HOUR_MS;

const PROBLEM_LEVELS = ['degraded', 'offline', 'maintenance', 'unknown'] as const satisfies readonly Level[];

/** Same as in schema.sql, so the cron can create the table if the schema was not re-applied before a deploy. */
export const HOURLY_DDL = `CREATE TABLE IF NOT EXISTS hourly (
  component       TEXT    NOT NULL,
  hour            INTEGER NOT NULL,
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
) WITHOUT ROWID`;

const COLUMNS = `component, hour, ${LEVELS.join(', ')}, lat_sum, lat_n, ${PROBLEM_LEVELS.map((l) => `msg_${l}`).join(', ')}`;

/** Rebuilds hourly rows from raw samples since `since`. One statement, run once (the first cron run after deploy). */
export function hourlyFromSamples(db: D1Database, since: number): D1PreparedStatement {
  const msg = (l: string) =>
    `(SELECT message FROM samples m WHERE m.component = g.component AND m.ts >= g.hour AND m.ts < g.hour + ${HOUR_MS} AND m.status = '${l}' ORDER BY m.ts DESC LIMIT 1)`;
  return db
    .prepare(
      `INSERT OR REPLACE INTO hourly (${COLUMNS})
       SELECT component, hour, ${LEVELS.map((l) => `SUM(status = '${l}')`).join(', ')}, COALESCE(SUM(latency_ms), 0), COUNT(latency_ms),
              ${PROBLEM_LEVELS.map(msg).join(', ')}
       FROM (SELECT component, ts / ${HOUR_MS} * ${HOUR_MS} AS hour, status, latency_ms FROM samples WHERE ts >= ?) g
       GROUP BY component, hour`,
    )
    .bind(since);
}

/** multiRow arguments that add one run's results to their hour. */
export function hourlyUpsert(ts: number, results: CheckResult[]): [head: string, tail: string, rows: unknown[][]] {
  const hour = hourOf(ts);
  return [
    `INSERT INTO hourly (${COLUMNS}) VALUES`,
    `ON CONFLICT (component, hour) DO UPDATE SET ${LEVELS.map((l) => `${l} = ${l} + excluded.${l}`).join(', ')},
       lat_sum = lat_sum + excluded.lat_sum, lat_n = lat_n + excluded.lat_n,
       ${PROBLEM_LEVELS.map((l) => `msg_${l} = COALESCE(excluded.msg_${l}, msg_${l})`).join(', ')}`,
    results.map((r) => [
      r.component,
      hour,
      ...LEVELS.map((l) => +(r.status === l)),
      r.latencyMs ?? 0,
      r.latencyMs == null ? 0 : 1,
      ...PROBLEM_LEVELS.map((l) => (r.status === l ? r.message.slice(0, 500) : null)),
    ]),
  ];
}

export interface HourlyRow extends Record<Level, number> {
  component: string;
  hour: number;
  lat_sum: number;
  lat_n: number;
  msg_degraded: string | null;
  msg_offline: string | null;
  msg_maintenance: string | null;
  msg_unknown: string | null;
}

/** Hourly rows in the shape buildBuckets takes (buckets must be whole hours, aligned to the hour). */
export function hourlyAsSamples(start: number, size: number, rows: HourlyRow[]): { agg: AggRow[]; problems: ProblemRow[] } {
  const agg: AggRow[] = [];
  const problems: ProblemRow[] = [];
  for (const r of rows) {
    const b = Math.floor((r.hour - start) / size);
    for (const l of LEVELS) if (r[l]) agg.push({ b, status: l, n: r[l], lat_sum: null, lat_n: 0 });
    if (r.lat_n) agg.push({ b, status: 'operational', n: 0, lat_sum: r.lat_sum, lat_n: r.lat_n });
    for (const l of PROBLEM_LEVELS) {
      const message = r[`msg_${l}`];
      // Only the hour is known; within a bucket, a later hour still sorts as newer.
      if (message != null) problems.push({ ts: r.hour, status: l, message });
    }
  }
  return { agg, problems };
}
