// Turns raw one-minute samples into fixed-size buckets for the short-range views (1 h … 7 d).
import { emptyCounts, LEVELS, SEVERITY, uptimeOf, worst, type Bucket, type Level } from '../shared/status.ts';

/** Per bucket and status: how many samples and the sum/count of their latencies (from a GROUP BY). */
export interface AggRow {
  b: number;
  status: Level;
  n: number;
  lat_sum: number | null;
  lat_n: number;
}

/** Non-operational samples with their messages, to explain a bad bucket. */
export interface ProblemRow {
  ts: number;
  status: Level;
  message: string;
}

/** Aligned so buckets line up with clock times: the last bucket holds `now`. */
export function bucketWindow(now: number, minutes: number, bucketMinutes: number) {
  const size = bucketMinutes * 60_000;
  const n = Math.round(minutes / bucketMinutes);
  const end = Math.floor(now / size) * size + size;
  return { start: end - n * size, size, n };
}

/** The level a bucket shows: its worst measured level; Unknown only when nothing else was measured. */
export function displayLevel(counts: Record<Level, number>): Level | null {
  const known = LEVELS.filter((l) => l !== 'unknown' && counts[l] > 0);
  if (known.length) return worst(known);
  return counts.unknown > 0 ? 'unknown' : null;
}

export function buildBuckets(start: number, size: number, n: number, agg: AggRow[], problems: ProblemRow[]): Bucket[] {
  const out: Bucket[] = Array.from({ length: n }, (_, i) => ({
    start: new Date(start + i * size).toISOString(),
    minutes: size / 60_000,
    counts: emptyCounts(),
    uptime: null,
    worst: null,
    latency_ms: null,
    message: null,
  }));
  const lat = Array.from({ length: n }, () => ({ sum: 0, n: 0 }));
  for (const r of agg) {
    if (r.b < 0 || r.b >= n || !(r.status in out[0].counts)) continue;
    out[r.b].counts[r.status] += Number(r.n);
    if (r.lat_n) {
      lat[r.b].sum += Number(r.lat_sum ?? 0);
      lat[r.b].n += Number(r.lat_n);
    }
  }
  out.forEach((b, i) => {
    b.uptime = uptimeOf(b.counts);
    b.worst = displayLevel(b.counts);
    b.latency_ms = lat[i].n ? Math.round(lat[i].sum / lat[i].n) : null;
  });
  // Newest message at the bucket's worst level.
  const best = new Map<number, ProblemRow>();
  for (const p of problems) {
    const i = Math.floor((p.ts - start) / size);
    if (i < 0 || i >= n || p.status !== out[i].worst) continue;
    const cur = best.get(i);
    if (!cur || p.ts > cur.ts || SEVERITY[p.status] > SEVERITY[cur.status]) best.set(i, p);
  }
  for (const [i, p] of best) out[i].message = p.message;
  return out;
}
