import { describe, expect, it } from 'vitest';
import { checkChain } from '../worker/checks/chain.ts';
import { checkpointAt, fakeDeps, fixtureJson, jsonRes, RECORDED_AT } from './helpers.ts';

describe('Sui checkpoints and GraphQL endpoint', () => {
  it('recorded answer, 5 s later: both operational', async () => {
    const { deps } = fakeDeps(() => jsonRes(fixtureJson('checkpoint.json')), { now: RECORDED_AT + 5_000 });
    const r = await checkChain(deps);
    expect(r.graphql.status).toBe('operational');
    expect(r.checkpoints.status).toBe('operational');
    expect(r.chain?.healthy).toBe(true);
    expect(r.chain?.checkpoint).toBe(Number(fixtureJson('checkpoint.json').data.checkpoint.sequenceNumber));
  });

  it('checkpoint 2 minutes old: degraded, chain not healthy', async () => {
    const now = RECORDED_AT + 10_000;
    const { deps } = fakeDeps(() => checkpointAt(now - 120_000), { now });
    const r = await checkChain(deps);
    expect(r.checkpoints.status).toBe('degraded');
    expect(r.chain?.healthy).toBe(false);
  });

  it('checkpoint 10 minutes old: offline', async () => {
    const now = RECORDED_AT;
    const { deps } = fakeDeps(() => checkpointAt(now - 600_000), { now });
    expect((await checkChain(deps)).checkpoints.status).toBe('offline');
  });

  it('answer slower than 2 s: endpoint degraded', async () => {
    const { deps } = fakeDeps(() => jsonRes(fixtureJson('checkpoint.json')), { now: RECORDED_AT, latencyMs: 2_500 });
    const r = await checkChain(deps);
    expect(r.graphql.status).toBe('degraded');
    expect(r.graphql.latencyMs).toBe(2_500);
  });

  it('three failed tries: endpoint offline, checkpoints unknown (probe could not read them)', async () => {
    const { deps, calls } = fakeDeps(() => new Response('bad gateway', { status: 502 }));
    const r = await checkChain(deps);
    expect(calls).toHaveLength(3);
    expect(r.graphql.status).toBe('offline');
    expect(r.checkpoints.status).toBe('unknown');
    expect(r.chain).toBeNull();
  });

  it('GraphQL errors count as failed tries', async () => {
    const { deps, calls } = fakeDeps(() => jsonRes({ errors: [{ message: 'Request timed out' }] }));
    const r = await checkChain(deps);
    expect(calls).toHaveLength(3);
    expect(r.graphql.status).toBe('offline');
  });

  it('recovers on the second try', async () => {
    let n = 0;
    const { deps } = fakeDeps(() => (++n === 1 ? 'network' : jsonRes(fixtureJson('checkpoint.json'))));
    const r = await checkChain(deps);
    expect(r.graphql.status).toBe('operational');
    expect(r.graphql.message).toMatch(/after 2 tries/);
  });

  it('429: unknown, not offline, and backs off', async () => {
    const { deps, calls } = fakeDeps(() => new Response('', { status: 429, headers: { 'retry-after': '30' } }));
    const r = await checkChain(deps);
    expect(r.graphql.status).toBe('unknown');
    expect(r.checkpoints.status).toBe('unknown');
    expect(calls).toHaveLength(1);
    expect(deps.backoff.get('graphql.testnet.sui.io')).toBeGreaterThan(deps.now());
    // next run within the backoff does not call at all
    const again = await checkChain(deps);
    expect(calls).toHaveLength(1);
    expect(again.graphql.status).toBe('unknown');
  });

  it('nonsense answer: checkpoints unknown', async () => {
    const { deps } = fakeDeps(() => jsonRes({ data: { checkpoint: null } }));
    const r = await checkChain(deps);
    expect(r.graphql.status).toBe('operational');
    expect(r.checkpoints.status).toBe('unknown');
  });
});
