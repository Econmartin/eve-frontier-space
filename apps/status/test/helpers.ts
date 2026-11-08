import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { Deps } from '../worker/http.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8');
export const fixtureJson = (name: string) => JSON.parse(fixture(name));

export const STILLNESS = '0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92';
export const UTOPIA = '0x28eab6a6e9e12808a15901b12fcd3adfb07317d716dcaeb3f2965e25c7da0230';
export const OLD_STILLNESS = '0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1';

/** The time the fixtures were recorded (the checkpoint fixture's timestamp). */
export const RECORDED_AT = Date.parse(fixtureJson('checkpoint.json').data.checkpoint.timestamp);

export type Handler = (url: string, body: string) => Response | Promise<Response> | 'network' | 'timeout';

export const jsonRes = (v: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(typeof v === 'string' ? v : JSON.stringify(v), { status, headers: { 'content-type': 'application/json', ...headers } });

/**
 * Deps with a fake clock and fetch. `latencyMs` is how long each request "takes" on the fake clock.
 * The handler sees the URL and the GraphQL query (or '').
 */
export function fakeDeps(handler: Handler, opts: { now?: number; latencyMs?: number | ((url: string) => number) } = {}) {
  let clock = opts.now ?? RECORDED_AT + 5_000;
  const calls: { url: string; body: string }[] = [];
  const deps: Deps = {
    now: () => clock,
    sleep: async () => {},
    backoff: new Map(),
    fetch: async (url, init) => {
      const body = typeof init?.body === 'string' ? (JSON.parse(init.body).query ?? init.body) : '';
      calls.push({ url, body });
      clock += typeof opts.latencyMs === 'function' ? opts.latencyMs(url) : (opts.latencyMs ?? 120);
      const r = await handler(url, body);
      if (r === 'network') throw new TypeError('fetch failed');
      if (r === 'timeout') throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
      return r;
    },
  };
  return { deps, calls, setNow: (t: number) => (clock = t) };
}

/** Recorded GraphQL/GitHub answers, routed by what the query asks for. Override pieces with `patch`. */
export function recordedChain(patch: Partial<Record<'checkpoint' | 'static' | 'live' | 'balances' | 'older' | 'toml', Handler>> = {}): Handler {
  return (url, q) => {
    if (url.includes('raw.githubusercontent.com')) {
      if (patch.toml) return patch.toml(url, q);
      return new Response(fixture(url.includes('/assets/') ? 'published-assets.toml' : 'published-world.toml'));
    }
    if (url.includes('world-api')) return jsonRes({ ok: true });
    if (q.includes('acl:')) {
      if (patch.static) return patch.static(url, q);
      if (q.includes(OLD_STILLNESS)) return jsonRes(fixtureJson('old-static.json'));
      return jsonRes(fixtureJson('stillness-static.json'));
    }
    if (q.includes('sponsors:')) {
      if (patch.live) return patch.live(url, q);
      return jsonRes(fixtureJson(q.includes(OLD_STILLNESS) ? 'old-live.json' : 'stillness-live.json'));
    }
    if (q.includes('before:')) {
      if (patch.older) return patch.older(url, q);
      return jsonRes({ data: { recent: { pageInfo: { hasPreviousPage: false, startCursor: null }, nodes: [] } } });
    }
    if (q.includes('b0:')) {
      if (patch.balances) return patch.balances(url, q);
      // answer every alias asked for with 500 SUI (tests that care about balances patch this)
      const aliases = [...q.matchAll(/(b\d+): address\(address: "(0x[0-9a-f]+)"\)/g)];
      return jsonRes({ data: Object.fromEntries(aliases.map(([, a]) => [a, { balance: { totalBalance: '500000000000' } }])) });
    }
    if (q.includes('checkpoint {')) {
      if (patch.checkpoint) return patch.checkpoint(url, q);
      return jsonRes(fixtureJson('checkpoint.json'));
    }
    throw new Error('unrouted request: ' + url + ' ' + q.slice(0, 80));
  };
}

export const checkpointAt = (ms: number, seq = 404150000) =>
  jsonRes({ data: { checkpoint: { sequenceNumber: seq, timestamp: new Date(ms).toISOString(), epoch: { epochId: 1277 } } } });
