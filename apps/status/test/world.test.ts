import { beforeAll, describe, expect, it } from 'vitest';
import { checkContracts, checkWorld, inMaintenance, type WorldCursor } from '../worker/checks/world.ts';
import type { ChainState } from '../worker/checks/types.ts';
import { WORLDS } from '../worker/config.ts';
import { parsePublishedToml, resolveWorld, type ResolvedWorld, type Upstream } from '../worker/resolve.ts';
import { fakeDeps, fixture, fixtureJson, jsonRes, OLD_STILLNESS, RECORDED_AT, recordedChain, STILLNESS } from './helpers.ts';

const stillness = WORLDS.find((w) => w.tenant === 'stillness')!;
const upstream: Upstream = {
  world: parsePublishedToml(fixture('published-world.toml')),
  assets: parsePublishedToml(fixture('published-assets.toml')),
  fetchedAt: RECORDED_AT,
};
const live = fixtureJson('stillness-live.json').data;
const sponsorSet = new Set(live.sponsors.dynamicFields.nodes.map((n: any) => n.name.json));
const newestSponsored = Math.max(
  ...[...live.recent.nodes, ...live.fresh.nodes].filter((t: any) => sponsorSet.has(t.gasInput?.gasSponsor?.address)).map((t: any) => Date.parse(t.effects.timestamp)),
);
const chainAt = (now: number, healthy = true): ChainState => ({ checkpoint: 404150000, checkpointAt: now - 3000, epoch: 1277, healthy });

let resolved: ResolvedWorld;
let resolvedOld: ResolvedWorld;
beforeAll(async () => {
  const { deps } = fakeDeps(recordedChain());
  resolved = (await resolveWorld(deps, stillness, upstream, null, null)).world!;
  resolvedOld = (await resolveWorld(deps, stillness, upstream, null, OLD_STILLNESS)).world!;
});

describe('resolving Stillness from Published.toml', () => {
  it('finds packages, AdminACL, tenant and the publish checkpoint', () => {
    expect(resolved.worldPackage).toBe(STILLNESS);
    expect(resolved.assetsPackage).toBe('0xc663658ff707985246bc7b5c605a458ec2caea28bfc35c253eb526dcf961643e');
    expect(resolved.chainTenant).toBe('stillness');
    expect(resolved.publishCheckpoint).toBe(387251155);
    expect(resolved.sponsorTable).toBe('0x9192e3a661c2c2323120f9dd01ac21cab06d2e3532094b5193e46c901f06a4b6');
  });
  it('a pin keeps the old package and still tells us upstream', () => {
    expect(resolvedOld.worldPackage).toBe(OLD_STILLNESS);
    expect(resolvedOld.upstreamWorldPackage).toBe(STILLNESS);
    expect(resolvedOld.chainTenant).toBe('stillness'); // the tenant cannot tell deployments apart
  });
});

describe('game server heartbeat', () => {
  const run = async (now: number, opts: { healthy?: boolean; prev?: WorldCursor | null; handler?: Parameters<typeof fakeDeps>[0]; r?: ResolvedWorld } = {}) => {
    const { deps } = fakeDeps(opts.handler ?? recordedChain(), { now });
    return checkWorld(deps, stillness, opts.r ?? resolved, null, chainAt(now, opts.healthy ?? true), opts.prev ?? null);
  };

  it('recorded answer, newest sponsored transaction seconds old: operational', async () => {
    const r = await run(newestSponsored + 30_000);
    expect(r.gameServer.status).toBe('operational');
    expect(r.cursor?.lastSponsoredAt).toBe(newestSponsored);
  });
  it('12 minutes since the last sponsored transaction: degraded', async () => {
    expect((await run(newestSponsored + 12 * 60_000)).gameServer.status).toBe('degraded');
  });
  it('25 minutes: offline', async () => {
    expect((await run(newestSponsored + 25 * 60_000)).gameServer.status).toBe('offline');
  });
  it('chain stalled: unknown, not offline', async () => {
    const r = await run(newestSponsored + 25 * 60_000, { healthy: false });
    expect(r.gameServer.status).toBe('unknown');
    expect(r.gameServer.message).toMatch(/Chain stalled/);
  });
  it('probe failure (GraphQL errors on the world query): unknown', async () => {
    const r = await run(newestSponsored + 30_000, { handler: recordedChain({ live: () => jsonRes({ errors: [{ message: 'boom' }] }) }) });
    expect(r.gameServer.status).toBe('unknown');
    expect(r.sponsorGas.status).toBe('unknown');
  });
  it('transactions not paid by an authorised sponsor do not count', async () => {
    const handler = recordedChain({
      live: () => {
        const d = structuredClone(fixtureJson('stillness-live.json'));
        for (const t of [...d.data.recent.nodes, ...d.data.fresh.nodes]) t.gasInput = { gasSponsor: { address: '0x' + 'ab'.repeat(32) } };
        d.data.recent.pageInfo.hasPreviousPage = false;
        return jsonRes(d);
      },
    });
    const r = await run(newestSponsored + 30_000, { handler });
    // all 50 latest are unsponsored and span only minutes, so we cannot say how old the heartbeat is
    expect(r.gameServer.status).toBe('unknown');
  });
  it('old package (pinned to 0x8b8a…1aa1): offline, newest transaction is from September', async () => {
    const now = RECORDED_AT + 5_000;
    const r = await run(now, { r: resolvedOld });
    expect(r.gameServer.status).toBe('offline');
    expect(r.cursor?.lastSponsoredAt).toBeLessThan(Date.parse('2026-10-01'));
  });
  it('scheduled downtime turns offline into maintenance', async () => {
    const now = newestSponsored + 25 * 60_000;
    const d = new Date(now);
    const w = { ...stillness, maintenance: [{ start: `${String(d.getUTCHours()).padStart(2, '0')}:00`, minutes: 120 }] };
    const { deps } = fakeDeps(recordedChain(), { now });
    const r = await checkWorld(deps, w, resolved, null, chainAt(now), null);
    expect(r.gameServer.status).toBe('maintenance');
  });
  it('records gaps between new sponsored transactions', async () => {
    const prev: WorldCursor = { pkg: STILLNESS, checkpoint: 404150000 - 250, lastSponsoredAt: newestSponsored - 60_000, lastSponsoredDigest: 'x', seen: {} };
    const r = await run(newestSponsored + 30_000, { prev });
    expect(r.gaps.length).toBeGreaterThan(0);
    expect(r.gaps.every((g) => g > 0)).toBe(true);
  });
});

describe('sponsor gas', () => {
  const withBalance = (mist: string) =>
    recordedChain({
      balances: (_u, q) => jsonRes({ data: Object.fromEntries([...q.matchAll(/(b\d+):/g)].map(([, a]) => [a, { balance: { totalBalance: mist } }])) }),
    });
  const run = async (handler: Parameters<typeof fakeDeps>[0]) => {
    const now = newestSponsored + 30_000;
    const { deps } = fakeDeps(handler, { now });
    return (await checkWorld(deps, stillness, resolved, null, chainAt(now), null)).sponsorGas;
  };
  it('1,732 SUI: operational', async () => expect((await run(withBalance('1732452104427'))).status).toBe('operational'));
  it('40 SUI: degraded (low)', async () => expect((await run(withBalance('40000000000'))).status).toBe('degraded'));
  it('0.01 SUI: offline (empty)', async () => expect((await run(withBalance('10000000'))).status).toBe('offline'));
  it('balance query fails: unknown', async () => expect((await run(recordedChain({ balances: () => jsonRes({}, 500) }))).status).toBe('unknown'));
  it('only active sponsors are graded', async () => {
    const handler = recordedChain({
      balances: (_u, q) =>
        jsonRes({
          data: Object.fromEntries(
            [...q.matchAll(/(b\d+): address\(address: "(0x[0-9a-f]+)"\)/g)].map(([, a, addr]) => [
              a,
              { balance: { totalBalance: addr.startsWith('0xf60a') ? '1732452104427' : '1000' } },
            ]),
          ),
        }),
    });
    const r = await run(handler);
    expect(r.status).toBe('operational'); // the idle sponsor's near-empty balance does not matter
  });
});

describe('world contracts', () => {
  it('match: operational', () => expect(checkContracts(stillness, resolved, null).status).toBe('operational'));
  it('pinned to the old package: degraded mismatch', () => {
    const r = checkContracts(stillness, resolvedOld, null);
    expect(r.status).toBe('degraded');
    expect(r.message).toMatch(/Mismatch/);
  });
  it('Published.toml never read: unknown', () => expect(checkContracts(stillness, { ...resolved, upstreamWorldPackage: null }, null).status).toBe('unknown'));
  it('no resolution at all: unknown', () => expect(checkContracts(stillness, null, null).status).toBe('unknown'));
  it('redeploy detected when upstream moves', async () => {
    const { deps } = fakeDeps(recordedChain());
    const prev = { ...resolved, upstreamWorldOriginal: OLD_STILLNESS, upstreamWorldPackage: OLD_STILLNESS };
    const { world, change } = await resolveWorld(deps, stillness, upstream, prev, null);
    expect(change).toEqual({ kind: 'world_redeployed', from: OLD_STILLNESS, to: STILLNESS });
    expect(world?.worldPackage).toBe(STILLNESS);
    expect(checkContracts(stillness, world, change).message).toMatch(/redeployed/);
  });
});

describe('maintenance windows', () => {
  it('spans midnight', () => {
    const w = [{ start: '23:30', minutes: 60 }];
    expect(inMaintenance(Date.parse('2026-11-08T00:15:00Z'), w)).toBeTruthy();
    expect(inMaintenance(Date.parse('2026-11-08T00:45:00Z'), w)).toBeNull();
  });
  it('respects days of the week', () => {
    const w = [{ days: [0], start: '11:00', minutes: 30 }]; // Sundays
    expect(inMaintenance(Date.parse('2026-11-08T11:10:00Z'), w)).toBeTruthy(); // 8 Nov 2026 is a Sunday
    expect(inMaintenance(Date.parse('2026-11-09T11:10:00Z'), w)).toBeNull();
  });
});
