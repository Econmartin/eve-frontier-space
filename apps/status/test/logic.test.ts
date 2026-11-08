import { describe, expect, it } from 'vitest';
import { describe as describeSummary, envelope } from '../worker/api.ts';
import { addGaps, emptyHist, quantile, suggestThresholds } from '../worker/gaps.ts';
import { decide } from '../worker/incidents.ts';
import { parsePublishedToml } from '../worker/resolve.ts';
import { emptyCounts, uptimeOf, worst, type ComponentStatus, type Level } from '../shared/status.ts';
import { fixture } from './helpers.ts';

describe('incidents', () => {
  const none = null;
  it('opens after 3 bad samples in a row', () => {
    expect(decide(['degraded', 'offline'], none)).toEqual({ action: 'none' });
    expect(decide(['offline', 'degraded', 'degraded'], none)).toEqual({ action: 'open', impact: 'offline' });
  });
  it('a good sample in between resets the count', () => {
    expect(decide(['offline', 'operational', 'offline', 'offline'], none)).toEqual({ action: 'none' });
  });
  it('unknown samples are skipped, not counted as good or bad', () => {
    expect(decide(['offline', 'unknown', 'offline', 'unknown', 'offline'], none)).toEqual({ action: 'open', impact: 'offline' });
    expect(decide(['unknown', 'unknown', 'unknown'], none)).toEqual({ action: 'none' });
  });
  it('closes after 5 good samples', () => {
    const open = { impact: 'degraded' as Level, automatic: true };
    expect(decide(['operational', 'operational', 'operational', 'operational'], open)).toEqual({ action: 'none' });
    expect(decide(['operational', 'operational', 'operational', 'operational', 'operational', 'offline'], open)).toEqual({ action: 'close' });
  });
  it('admin incidents are never closed automatically', () => {
    expect(decide(Array(10).fill('operational'), { impact: 'degraded', automatic: false })).toEqual({ action: 'none' });
  });
  it('escalates degraded to offline', () => {
    expect(decide(['offline', 'degraded'], { impact: 'degraded', automatic: true })).toEqual({ action: 'escalate', impact: 'offline' });
  });
});

describe('Published.toml', () => {
  it('reads every section', () => {
    const w = parsePublishedToml(fixture('published-world.toml'));
    expect(Object.keys(w)).toEqual(expect.arrayContaining(['testnet', 'testnet_stillness', 'testnet_utopia']));
    expect(w.testnet_utopia.publishedAt).toBe('0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230');
    expect(w.testnet.originalId).not.toBe(w.testnet.publishedAt); // an upgraded package
  });
  it('lowercases addresses', () => {
    const w = parsePublishedToml('[published.x]\npublished-at = "0xABCD"\n');
    expect(w.x.publishedAt).toBe('0x' + '0'.repeat(60) + 'abcd');
  });
});

describe('uptime and levels', () => {
  it('offline minutes are down, degraded are up, unknown left out', () => {
    expect(uptimeOf({ ...emptyCounts(), operational: 90, degraded: 5, offline: 5, unknown: 100 })).toBe(0.95);
    expect(uptimeOf({ ...emptyCounts(), unknown: 10 })).toBeNull();
  });
  it('unknown is less severe than degraded', () => {
    expect(worst(['unknown', 'degraded', 'operational'])).toBe('degraded');
    expect(worst(['unknown', 'operational'])).toBe('unknown');
  });
});

describe('stale flag', () => {
  const ctx = (lastRunAgo: number | null) => ({ db: null as any, env: {}, now: 1_000_000_000, lastRun: lastRunAgo == null ? null : 1_000_000_000 - lastRunAgo });
  it('fresh within 3 minutes', () => expect(envelope(ctx(2 * 60_000)).stale).toBe(false));
  it('stale after the cron stopped for 5 minutes', () => expect(envelope(ctx(5 * 60_000)).stale).toBe(true));
  it('stale when nothing was ever measured', () => expect(envelope(ctx(null)).stale).toBe(true));
});

describe('summary sentence', () => {
  const comp = (group: string, status: Level) => ({ group, status }) as ComponentStatus;
  const g = (name: string, ...s: Level[]) => ({ name, components: s.map((x) => comp(name, x)) });
  it('all operational', () => expect(describeSummary([g('Sui testnet', 'operational'), g('Stillness', 'operational')], false).description).toBe('All systems operational'));
  it('names degraded worlds', () =>
    expect(describeSummary([g('Sui testnet', 'operational'), g('Stillness', 'operational', 'degraded'), g('Utopia', 'offline')], false).description).toBe(
      'Stillness degraded · Utopia offline',
    ));
  it('says when it is out of date', () => expect(describeSummary([g('Stillness', 'operational')], true).description).toMatch(/^Out of date/));
});

describe('gap histogram', () => {
  it('quantiles and suggestions', () => {
    const gaps = [...Array(990).fill(5), ...Array(9).fill(100), 420];
    const h = addGaps(emptyHist(), gaps);
    expect(h.n).toBe(1000);
    expect(quantile(h, 0.5)).toBe(5);
    expect(quantile(h, 0.99)).toBe(5);
    expect(quantile(h, 0.999)).toBe(120);
    expect(h.max).toBe(420);
    expect(suggestThresholds(h)).toEqual({ degradedAfterSec: 300, offlineAfterSec: 840 });
  });
});
