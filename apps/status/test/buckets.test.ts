import { describe, expect, it } from 'vitest';
import { bucketWindow, buildBuckets } from '../worker/buckets.ts';

const NOW = Date.parse('2026-11-08T10:07:30Z');

describe('bucket windows', () => {
  it('1 hour by minute ends with the current minute', () => {
    const w = bucketWindow(NOW, 60, 1);
    expect(w.n).toBe(60);
    expect(new Date(w.start).toISOString()).toBe('2026-11-08T09:08:00.000Z');
    expect(w.start + w.n * w.size).toBe(Date.parse('2026-11-08T10:08:00Z'));
  });
  it('7 days by hour lines up with whole hours', () => {
    const w = bucketWindow(NOW, 10080, 60);
    expect(w.n).toBe(168);
    expect(new Date(w.start).getUTCMinutes()).toBe(0);
  });
});

describe('buckets', () => {
  const { start, size, n } = bucketWindow(NOW, 60, 5); // 12 five-minute buckets
  it('counts, uptime, worst level and mean latency per bucket', () => {
    const b = buildBuckets(
      start,
      size,
      n,
      [
        { b: 0, status: 'operational', n: 4, lat_sum: 400, lat_n: 4 },
        { b: 0, status: 'offline', n: 1, lat_sum: null, lat_n: 0 },
        { b: 3, status: 'degraded', n: 5, lat_sum: 12500, lat_n: 5 },
        { b: 5, status: 'unknown', n: 5, lat_sum: null, lat_n: 0 },
      ],
      [
        { ts: start + 60_000, status: 'offline', message: 'HTTP 502 (3 tries)' },
        { ts: start + 3 * size + 10, status: 'degraded', message: 'old' },
        { ts: start + 3 * size + 120_000, status: 'degraded', message: 'Slow: answered in 2.5 s' },
      ],
    );
    expect(b).toHaveLength(12);
    expect(b[0]).toMatchObject({ worst: 'offline', uptime: 0.8, latency_ms: 100, message: 'HTTP 502 (3 tries)' });
    expect(b[3]).toMatchObject({ worst: 'degraded', uptime: 1, latency_ms: 2500, message: 'Slow: answered in 2.5 s' });
    expect(b[5]).toMatchObject({ worst: 'unknown', uptime: null });
    expect(b[1]).toMatchObject({ worst: null, uptime: null, message: null }); // no data
  });
  it('ignores rows outside the window', () => {
    const b = buildBuckets(start, size, n, [{ b: 99, status: 'offline', n: 1, lat_sum: null, lat_n: 0 }], [{ ts: start - 1, status: 'offline', message: 'x' }]);
    expect(b.every((x) => x.worst === null)).toBe(true);
  });
});
