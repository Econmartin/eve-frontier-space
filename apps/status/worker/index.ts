// Entry points used by the site's _worker.js: handleStatus() for /status/api/*, /status/feeds/* and
// /status/openapi.yaml; runStatusCron() for the every-minute Cron Trigger.
import * as api from './api.ts';
import { COMPONENTS, COMPONENT_BY_ID, WORLDS, type Env } from './config.ts';
import { runCron } from './run.ts';
// Bundled as text by wrangler (see the [[rules]] in wrangler.toml).
import openapi from '../openapi.yaml';

export { runCron as runStatusCron };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-max-age': '86400',
};
const EDGE_TTL = 30;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...headers },
  });

const cacheable = (r: Response) => {
  r.headers.set('cache-control', `public, max-age=${EDGE_TTL}, s-maxage=${EDGE_TTL}`);
  return r;
};

// Fallback when the rate-limit binding is missing (e.g. old local config): per isolate, roughly per minute.
const memoryBuckets = new Map<string, { n: number; reset: number }>();
async function allowed(env: Env, ip: string): Promise<boolean> {
  if (env.STATUS_RATE_LIMITER) {
    try {
      return (await env.STATUS_RATE_LIMITER.limit({ key: ip })).success;
    } catch {
      return true;
    }
  }
  const now = Date.now();
  const b = memoryBuckets.get(ip);
  if (!b || b.reset < now) {
    memoryBuckets.set(ip, { n: 1, reset: now + 60_000 });
    if (memoryBuckets.size > 10_000) memoryBuckets.clear();
    return true;
  }
  return ++b.n <= 60;
}

async function ipHash(ip: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('status:' + ip));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Returns a Response for status routes, or null to let the site handle the request. */
export async function handleStatus(request: Request, env: Env, ctx: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);
  const p = url.pathname.replace(/\/+$/, '');
  const isApi = p.startsWith('/status/api/');
  const isFeed = p === '/status/feeds/incidents.rss';
  if (p === '/status/openapi.yaml') {
    return new Response(openapi, { headers: { 'content-type': 'application/yaml; charset=utf-8', ...CORS, 'cache-control': 'public, max-age=3600' } });
  }
  if (!isApi && !isFeed) return null;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  if (!(await allowed(env, ip))) return json({ error: 'rate limited: 60 requests a minute per address' }, 429, { 'retry-after': '60' });

  const db = env.STATUS_DB;
  if (!db) return json({ error: 'status storage not configured' }, 503);

  // Edge cache for public GETs (30 s). The key is the full URL.
  const publicGet = request.method === 'GET' && !p.startsWith('/status/api/admin');
  const cache = (globalThis as any).caches?.default as Cache | undefined;
  if (publicGet && cache) {
    const hit = await cache.match(request.url);
    if (hit) return hit;
  }

  let res: Response;
  try {
    res = await route(request, url, p, env, db);
  } catch (e) {
    if (e instanceof api.HttpError) res = json({ error: e.message }, e.status);
    else {
      console.error('status api error', e);
      res = json({ error: 'internal error' }, 500);
    }
  }
  if (publicGet && res.status === 200) {
    cacheable(res);
    if (cache) ctx.waitUntil(cache.put(request.url, res.clone()));
  }
  return res;
}

async function route(request: Request, url: URL, p: string, env: Env, db: D1Database): Promise<Response> {
  const c = await api.makeCtx(db, env);
  const q = url.searchParams;
  const m = request.method;

  if (p === '/status/feeds/incidents.rss' && m === 'GET') {
    return new Response(await api.rss(c, url.origin), { headers: { 'content-type': 'application/rss+xml; charset=utf-8', ...CORS } });
  }

  const v1 = p.match(/^\/status\/api\/v1(\/.*)?$/);
  if (v1) {
    const r = v1[1] ?? '/';
    if (m === 'GET') {
      if (r === '/' ) return json({ ...api.envelope(c), docs: `${url.origin}/status/api`, openapi: `${url.origin}/status/openapi.yaml` });
      if (r === '/summary') return json(await api.summary(c));
      if (r === '/recent') return json({ ...api.envelope(c), ...(await api.recent(c)) });
      const comp = r.match(/^\/components\/([a-z0-9-]+)$/);
      if (comp) {
        const info = COMPONENT_BY_ID.get(comp[1]);
        if (!info) throw new api.HttpError(404, `unknown component: ${comp[1]}`);
        const s = await api.summary(c);
        const current = s.groups.flatMap((g) => g.components).find((x) => x.id === info.id)!;
        const days = (await api.history(c, [info.id], 90))[info.id];
        return json({ ...api.envelope(c), component: current, days });
      }
      const samp = r.match(/^\/components\/([a-z0-9-]+)\/samples$/);
      if (samp) {
        if (!COMPONENT_BY_ID.has(samp[1])) throw new api.HttpError(404, `unknown component: ${samp[1]}`);
        return json({ ...api.envelope(c), component: samp[1], ...(await api.samples(c, samp[1], q.get('range') ?? '1h')) });
      }
      const world = r.match(/^\/worlds\/([a-z0-9-]+)$/);
      if (world) return json(await api.world(c, world[1]));
      const gaps = r.match(/^\/worlds\/([a-z0-9-]+)\/gaps$/);
      if (gaps) return json(await api.gaps(c, gaps[1], api.clampDays(q.get('days'), 14, 400)));
      if (r === '/worlds') return json({ ...api.envelope(c), worlds: WORLDS.map((w) => ({ tenant: w.tenant, name: w.name })) });
      if (r === '/components') return json({ ...api.envelope(c), components: COMPONENTS });
      if (r === '/incidents') {
        const st = q.get('status');
        if (st && st !== 'open' && st !== 'resolved') throw new api.HttpError(400, 'status must be open or resolved');
        const limit = Math.min(200, Math.max(1, Number(q.get('limit') ?? 50) || 50));
        return json({ ...api.envelope(c), incidents: await api.incidents(c, (st as 'open' | 'resolved') ?? null, limit) });
      }
      if (r === '/events') return json({ ...api.envelope(c), events: await api.events(c, 50) });
      if (r === '/history') {
        const days = api.clampDays(q.get('days'), 90, 400);
        const id = q.get('component');
        if (id && !COMPONENT_BY_ID.has(id)) throw new api.HttpError(404, `unknown component: ${id}`);
        const ids = id ? [id] : COMPONENTS.map((x) => x.id);
        return json({ ...api.envelope(c), days, history: await api.history(c, ids, days) });
      }
    }
    if (r === '/subscriptions' && m === 'POST') {
      const body = await request.json().catch(() => null);
      return json(await api.subscribe(c, body, await ipHash(request.headers.get('cf-connecting-ip') ?? 'local')), 201);
    }
    const sub = r.match(/^\/subscriptions\/([0-9a-f]{16})$/);
    if (sub && m === 'DELETE') return json(await api.unsubscribe(c, sub[1], request.headers.get('authorization')));
  }

  const admin = p.match(/^\/status\/api\/admin(\/.*)$/);
  if (admin && m === 'POST') {
    await api.requireAdmin(env, request.headers.get('authorization'));
    const body = await request.json().catch(() => null);
    const r = admin[1];
    if (r === '/incidents') return json(await api.adminCreateIncident(c, body), 201);
    const up = r.match(/^\/incidents\/(\d+)\/(updates|resolve)$/);
    if (up) return json(await api.adminAddUpdate(c, Number(up[1]), body, up[2] === 'resolve'), 201);
  }

  throw new api.HttpError(m === 'GET' || m === 'POST' || m === 'DELETE' ? 404 : 405, 'not found');
}
