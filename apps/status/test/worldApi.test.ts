import { describe, expect, it } from 'vitest';
import { checkWorldApi } from '../worker/checks/worldApi.ts';
import { fakeDeps, jsonRes } from './helpers.ts';

const BASE = 'https://world-api-stillness.live.pub.evefrontier.com';

describe('World API', () => {
  it('{"ok":true} quickly: operational', async () => {
    const { deps, calls } = fakeDeps(() => jsonRes({ ok: true }), { latencyMs: 316 });
    const r = await checkWorldApi(deps, 'stillness', BASE);
    expect(r.status).toBe('operational');
    expect(r.latencyMs).toBe(316);
    expect(calls[0].url).toBe(`${BASE}/health`);
  });

  it('healthy but over 2 s: degraded', async () => {
    const { deps } = fakeDeps(() => jsonRes({ ok: true }), { latencyMs: 3_100 });
    expect((await checkWorldApi(deps, 'stillness', BASE)).status).toBe('degraded');
  });

  it('500 three times: offline', async () => {
    const { deps, calls } = fakeDeps(() => jsonRes({ error: 'x' }, 500));
    const r = await checkWorldApi(deps, 'stillness', BASE);
    expect(calls).toHaveLength(3);
    expect(r.status).toBe('offline');
  });

  it('{"ok":false}: offline after 3 tries', async () => {
    const { deps, calls } = fakeDeps(() => jsonRes({ ok: false }));
    expect((await checkWorldApi(deps, 'stillness', BASE)).status).toBe('offline');
    expect(calls).toHaveLength(3);
  });

  it('timeouts: offline, flagged as a network failure', async () => {
    const { deps } = fakeDeps(() => 'timeout');
    const r = await checkWorldApi(deps, 'stillness', BASE);
    expect(r.status).toBe('offline');
    expect(r.networkFailure).toBe(true);
  });

  it('probe failure (we are backing off this host): unknown', async () => {
    const { deps, calls } = fakeDeps(() => jsonRes({ ok: true }));
    deps.backoff.set(new URL(BASE).host, deps.now() + 60_000);
    const r = await checkWorldApi(deps, 'stillness', BASE);
    expect(r.status).toBe('unknown');
    expect(calls).toHaveLength(0);
  });
});
