import { describe, expect, it } from 'vitest';
import { runChecks } from '../worker/run.ts';
import { COMPONENTS } from '../worker/config.ts';
import { fakeDeps, OLD_STILLNESS, RECORDED_AT, recordedChain } from './helpers.ts';

const empty = { upstream: null, worlds: {}, cursors: {} };
const byId = (out: Awaited<ReturnType<typeof runChecks>>) => Object.fromEntries(out.results.map((r) => [r.component, r]));

describe('a whole run', () => {
  it('produces exactly one sample per component', async () => {
    const { deps } = fakeDeps(recordedChain(), { now: RECORDED_AT + 5_000 });
    const out = await runChecks(deps, {}, empty);
    expect(out.results.map((r) => r.component)).toEqual(COMPONENTS.map((c) => c.id));
    const r = byId(out);
    expect(r['sui-checkpoints'].status).toBe('operational');
    expect(r['stillness-contracts'].status).toBe('operational');
    expect(r['stillness-world-api'].status).toBe('operational');
    expect(r['stillness-game-server'].status).toBe('operational');
    expect(out.worlds.stillness?.chainTenant).toBe('stillness');
  });

  it('pinned to the old Stillness package: game server offline, contracts show the mismatch', async () => {
    const { deps } = fakeDeps(recordedChain(), { now: RECORDED_AT + 5_000 });
    const out = await runChecks(deps, { STATUS_PIN_STILLNESS: OLD_STILLNESS }, empty);
    const r = byId(out);
    expect(r['stillness-game-server'].status).toBe('offline');
    expect(r['stillness-contracts'].status).toBe('degraded');
    expect(r['stillness-contracts'].message).toMatch(/Mismatch/);
  });

  it('chain stalled: world components that depend on it are unknown, not offline', async () => {
    const { deps } = fakeDeps(
      recordedChain({
        checkpoint: () =>
          new Response(JSON.stringify({ data: { checkpoint: { sequenceNumber: 1, timestamp: new Date(RECORDED_AT - 3600_000).toISOString(), epoch: { epochId: 1 } } } })),
      }),
      { now: RECORDED_AT + 40 * 60_000 },
    );
    const r = byId(await runChecks(deps, {}, empty));
    expect(r['sui-checkpoints'].status).toBe('offline');
    expect(r['stillness-game-server'].status).toBe('unknown');
    expect(r['utopia-game-server'].status).toBe('unknown');
  });

  it('every outside host unreachable: our probe failed, so everything is unknown', async () => {
    const { deps } = fakeDeps(() => 'network');
    const out = await runChecks(deps, {}, empty);
    expect(out.results.every((x) => x.status === 'unknown')).toBe(true);
  });

  it('one check throwing does not stop the others', async () => {
    const base = recordedChain();
    const { deps } = fakeDeps((url, q) => {
      if (url.includes('world-api')) throw new Error('surprise');
      return base(url, q);
    });
    const r = byId(await runChecks(deps, {}, empty));
    expect(r['stillness-world-api'].status).toBe('offline');
    expect(r['sui-graphql'].status).toBe('operational');
    expect(r['stillness-game-server'].status).toBe('operational');
  });
});
