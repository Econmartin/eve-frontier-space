import { describe, expect, it } from 'vitest';
import { LEVELS, type Level } from '../shared/status.ts';
import { bucketWindow, buildBuckets, type AggRow, type ProblemRow } from '../worker/buckets.ts';
import type { CheckResult } from '../worker/checks/types.ts';
import { hourlyAsSamples, hourlyUpsert, hourOf, type HourlyRow } from '../worker/hourly.ts';

const NOW = Date.parse('2026-11-08T10:07:30Z');

/** What the ON CONFLICT clause does, applied in memory. */
function applyUpserts(runs: { ts: number; results: CheckResult[] }[]): HourlyRow[] {
  const rows = new Map<string, HourlyRow>();
  for (const { ts, results } of runs) {
    for (const v of hourlyUpsert(ts, results)[2]) {
      const [component, hour, ...rest] = v as [string, number, ...any[]];
      const counts = rest.slice(0, 5) as number[];
      const [lat_sum, lat_n, msg_degraded, msg_offline, msg_maintenance, msg_unknown] = rest.slice(5);
      const key = `${component}@${hour}`;
      const cur = rows.get(key);
      if (!cur) {
        rows.set(key, { component, hour, ...Object.fromEntries(LEVELS.map((l, i) => [l, counts[i]])), lat_sum, lat_n, msg_degraded, msg_offline, msg_maintenance, msg_unknown } as HourlyRow);
        continue;
      }
      LEVELS.forEach((l, i) => (cur[l] += counts[i]));
      cur.lat_sum += lat_sum;
      cur.lat_n += lat_n;
      cur.msg_degraded = msg_degraded ?? cur.msg_degraded;
      cur.msg_offline = msg_offline ?? cur.msg_offline;
      cur.msg_maintenance = msg_maintenance ?? cur.msg_maintenance;
      cur.msg_unknown = msg_unknown ?? cur.msg_unknown;
    }
  }
  return [...rows.values()];
}

describe('hourly rollups', () => {
  it('give the same hour buckets as the raw samples they summarise', () => {
    const { start, size, n } = bucketWindow(NOW, 24 * 60, 60);
    const statuses: Level[] = ['operational', 'operational', 'degraded', 'operational', 'offline', 'unknown', 'maintenance', 'degraded'];
    const runs: { ts: number; results: CheckResult[] }[] = [];
    for (let ts = start + 2000, i = 0; ts < NOW; ts += 60_000, i++) {
      const status = statuses[(i * 7) % statuses.length];
      runs.push({ ts, results: [{ component: 'sui-graphql', status, message: `${status} #${i}`, latencyMs: i % 3 ? 100 + i : null }] });
    }

    // From raw samples, as the samples GROUP BY would give them.
    const agg = new Map<string, AggRow>();
    const problems: ProblemRow[] = [];
    for (const { ts, results } of runs) {
      const r = results[0];
      const b = Math.floor((ts - start) / size);
      const a = agg.get(`${b}/${r.status}`) ?? { b, status: r.status, n: 0, lat_sum: null, lat_n: 0 };
      a.n++;
      if (r.latencyMs != null) {
        a.lat_sum = (a.lat_sum ?? 0) + r.latencyMs;
        a.lat_n++;
      }
      agg.set(`${b}/${r.status}`, a);
      if (r.status !== 'operational') problems.push({ ts, status: r.status, message: r.message });
    }
    const fromSamples = buildBuckets(start, size, n, [...agg.values()], problems);

    const h = hourlyAsSamples(start, size, applyUpserts(runs));
    const fromHourly = buildBuckets(start, size, n, h.agg, h.problems);

    expect(fromHourly).toEqual(fromSamples);
    expect(fromHourly.filter((b) => b.message).length).toBeGreaterThan(20);
  });

  it('files a run under the hour it started in', () => {
    const ts = Date.parse('2026-11-08T10:59:59Z');
    expect(hourOf(ts)).toBe(Date.parse('2026-11-08T10:00:00Z'));
    expect(hourlyUpsert(ts, [{ component: 'x', status: 'offline', message: 'down' }])[2][0]).toEqual([
      'x', hourOf(ts), 0, 0, 1, 0, 0, 0, 0, null, 'down', null, null,
    ]);
  });
});
