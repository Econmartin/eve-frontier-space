// Histogram of gaps between sponsored world transactions. Kept per world per day so the game server thresholds can be
// recalculated from real data (GET /status/api/v1/worlds/{tenant}/gaps).

/** Upper bucket edges in seconds; the last bucket holds everything longer. */
export const GAP_EDGES = [1, 2, 3, 5, 7, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 420, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 21600];

export interface GapHist {
  buckets: number[];
  n: number;
  max: number;
}

export const emptyHist = (): GapHist => ({ buckets: new Array(GAP_EDGES.length + 1).fill(0), n: 0, max: 0 });

export function addGaps(h: GapHist, gaps: number[]): GapHist {
  const b = h.buckets.length === GAP_EDGES.length + 1 ? [...h.buckets] : emptyHist().buckets;
  let max = h.max;
  for (const g of gaps) {
    let i = GAP_EDGES.findIndex((e) => g <= e);
    if (i < 0) i = GAP_EDGES.length;
    b[i]++;
    if (g > max) max = g;
  }
  return { buckets: b, n: h.n + gaps.length, max };
}

export function mergeHists(hs: GapHist[]): GapHist {
  const out = emptyHist();
  for (const h of hs) {
    h.buckets.forEach((c, i) => (out.buckets[i] += c));
    out.n += h.n;
    out.max = Math.max(out.max, h.max);
  }
  return out;
}

/** Upper edge of the bucket holding the q-th quantile (so the true value is at most this). */
export function quantile(h: GapHist, q: number): number | null {
  if (!h.n) return null;
  const target = Math.ceil(q * h.n);
  let acc = 0;
  for (let i = 0; i < h.buckets.length; i++) {
    acc += h.buckets[i];
    if (acc >= target) return i < GAP_EDGES.length ? GAP_EDGES[i] : h.max;
  }
  return h.max;
}

/** Suggested thresholds: Degraded at twice the 99.9th percentile gap, Offline at twice the longest gap seen. */
export function suggestThresholds(h: GapHist) {
  const p999 = quantile(h, 0.999);
  if (p999 == null) return null;
  return { degradedAfterSec: Math.max(300, Math.round(2 * p999)), offlineAfterSec: Math.max(600, Math.round(2 * h.max)) };
}
