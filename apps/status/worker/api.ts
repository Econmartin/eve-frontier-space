// Read-only public API (v1), RSS, webhook subscriptions and the admin endpoints.
import {
  emptyCounts,
  LEVEL_LABEL,
  LEVELS,
  uptimeOf,
  worst,
  worstOf,
  type ComponentStatus,
  type Counts,
  type DayRollup,
  type Incident,
  type IncidentUpdate,
  type Level,
  type Summary,
  type WorldDetails,
  type WorldEvent,
  RANGES,
  type Bucket,
  type RangeKey,
} from '../shared/status.ts';
import type { WorldCursor } from './checks/world.ts';
import { COMPONENTS, COMPONENT_BY_ID, STALE_AFTER_MS, WORLDS, type Env } from './config.ts';
import { mergeHists, quantile, suggestThresholds, GAP_EDGES, type GapHist } from './gaps.ts';
import type { ResolvedWorld } from './resolve.ts';
import { dayOf } from './run.ts';
import { bucketWindow, buildBuckets, type AggRow, type ProblemRow } from './buckets.ts';
import { MAX_PER_IP_PER_DAY, MAX_SUBSCRIBERS, validWebhookUrl } from './webhooks.ts';

const iso = (ms: number | null | undefined) => (ms == null ? null : new Date(ms).toISOString());

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface Ctx {
  db: D1Database;
  env: Env;
  now: number;
  lastRun: number | null;
}

export async function makeCtx(db: D1Database, env: Env, now = Date.now()): Promise<Ctx> {
  const row = await db.prepare("SELECT MAX(ts) AS ts FROM samples WHERE component = 'sui-graphql'").first<{ ts: number | null }>();
  return { db, env, now, lastRun: row?.ts ?? null };
}

export const envelope = (c: Ctx) => ({
  generated_at: new Date(c.now).toISOString(),
  stale: c.lastRun == null || c.now - c.lastRun > STALE_AFTER_MS,
});

interface SampleRow {
  component: string;
  ts: number;
  status: Level;
  latency_ms: number | null;
  message: string;
  detail: string | null;
}

async function latestSamples(c: Ctx): Promise<Map<string, SampleRow>> {
  if (c.lastRun == null) return new Map();
  // The newest sample per component (all components are written together, but be robust to a partial run).
  const { results } = await c.db
    .prepare(
      `SELECT s.* FROM samples s JOIN (SELECT component, MAX(ts) AS ts FROM samples WHERE ts > ? GROUP BY component) m
       ON s.component = m.component AND s.ts = m.ts`,
    )
    .bind(c.lastRun - 30 * 60_000)
    .all<SampleRow>();
  return new Map(results.map((r) => [r.component, r]));
}

function componentStatuses(latest: Map<string, SampleRow>): ComponentStatus[] {
  return COMPONENTS.map((info) => {
    const s = latest.get(info.id);
    return {
      ...info,
      status: s?.status ?? 'unknown',
      message: s?.message ?? 'Not measured yet',
      checked_at: iso(s?.ts),
      latency_ms: s?.latency_ms ?? null,
    };
  });
}

export function describe(groups: { name: string; components: ComponentStatus[] }[], stale: boolean): { status: Level; description: string } {
  const all = groups.flatMap((g) => g.components.map((c) => c.status));
  const status = worst(all);
  const parts: string[] = [];
  for (const g of groups) {
    const w = worst(g.components.map((c) => c.status));
    if (w === 'degraded' || w === 'offline') parts.push(`${g.name} ${w}`);
    else if (w === 'maintenance') parts.push(`${g.name} under maintenance`);
  }
  let description: string;
  if (!parts.length) description = all.includes('unknown') ? 'All measured systems operational; some checks could not run' : 'All systems operational';
  else description = parts.join(' · ');
  if (stale) description = `Out of date: the monitor has not reported for over 3 minutes. Last known: ${description}`;
  return { status, description };
}

export async function summary(c: Ctx): Promise<Summary> {
  const latest = await latestSamples(c);
  const comps = componentStatuses(latest);
  const groups: Summary['groups'] = [];
  for (const comp of comps) {
    let g = groups.find((x) => x.name === comp.group);
    if (!g) groups.push((g = { name: comp.group, components: [] }));
    g.components.push(comp);
  }
  const env = envelope(c);
  const counts = emptyCounts();
  for (const comp of comps) counts[comp.status]++;
  return { ...env, ...describe(groups, env.stale), counts, last_sample_at: iso(c.lastRun), groups };
}

function clampDays(raw: string | null, def: number, max: number) {
  const n = raw == null ? def : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new HttpError(400, `days must be an integer from 1 to ${max}`);
  return n;
}

export async function history(c: Ctx, componentIds: string[], days: number): Promise<Record<string, DayRollup[]>> {
  const today = Date.parse(dayOf(c.now));
  const firstDay = dayOf(today - (days - 1) * 86400_000);
  const firstMs = Date.parse(firstDay);
  const ph = componentIds.map(() => '?').join(',');
  const [rows, incs] = await Promise.all([
    c.db
      .prepare(`SELECT * FROM rollups WHERE day >= ? AND component IN (${ph})`)
      .bind(firstDay, ...componentIds)
      .all<{ component: string; day: string } & Counts>(),
    c.db
      .prepare(`SELECT id, component, started_at, resolved_at FROM incidents WHERE (resolved_at IS NULL OR resolved_at >= ?) AND component IN (${ph})`)
      .bind(firstMs, ...componentIds)
      .all<{ id: number; component: string; started_at: number; resolved_at: number | null }>(),
  ]);
  const out: Record<string, DayRollup[]> = {};
  for (const id of componentIds) {
    const list: DayRollup[] = [];
    for (let i = 0; i < days; i++) {
      const start = firstMs + i * 86400_000;
      const date = dayOf(start);
      const r = rows.results.find((x) => x.component === id && x.day === date);
      const counts = emptyCounts();
      if (r) for (const l of LEVELS) counts[l] = Number(r[l] ?? 0);
      list.push({
        date,
        uptime: uptimeOf(counts),
        worst: worstOf(counts),
        counts,
        incident_ids: incs.results
          .filter((x) => x.component === id && x.started_at < start + 86400_000 && (x.resolved_at == null || x.resolved_at >= start))
          .map((x) => x.id),
      });
    }
    out[id] = list;
  }
  return out;
}

export async function incidents(c: Ctx, status: 'open' | 'resolved' | null, limit = 50, component?: string): Promise<Incident[]> {
  const where: string[] = [];
  const binds: unknown[] = [];
  if (status) where.push('status = ?'), binds.push(status);
  if (component) where.push('component = ?'), binds.push(component);
  const { results } = await c.db
    .prepare(`SELECT * FROM incidents ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY started_at DESC LIMIT ?`)
    .bind(...binds, limit)
    .all<{ id: number; component: string; title: string; impact: Level; status: 'open' | 'resolved'; started_at: number; resolved_at: number | null; automatic: number }>();
  if (!results.length) return [];
  const ids = results.map((r) => r.id);
  const ups = await c.db
    .prepare(`SELECT * FROM incident_updates WHERE incident_id IN (${ids.map(() => '?').join(',')}) ORDER BY ts DESC`)
    .bind(...ids)
    .all<{ id: number; incident_id: number; ts: number; kind: IncidentUpdate['kind']; author: IncidentUpdate['author']; body: string }>();
  return results.map((r) => {
    const comp = COMPONENT_BY_ID.get(r.component);
    return {
      id: r.id,
      component: r.component,
      component_name: comp ? `${comp.world ? comp.group + ' ' : ''}${comp.name}` : r.component,
      title: r.title,
      impact: r.impact,
      status: r.status,
      started_at: iso(r.started_at)!,
      resolved_at: iso(r.resolved_at),
      automatic: !!r.automatic,
      updates: ups.results
        .filter((u) => u.incident_id === r.id)
        .map((u) => ({ id: u.id, at: iso(u.ts)!, kind: u.kind, author: u.author, body: u.body })),
    };
  });
}

export async function events(c: Ctx, limit = 20): Promise<WorldEvent[]> {
  const { results } = await c.db
    .prepare('SELECT * FROM events ORDER BY ts DESC LIMIT ?')
    .bind(limit)
    .all<{ id: number; ts: number; tenant: string; kind: WorldEvent['kind']; body: string; detail: string | null }>();
  return results.map((e) => ({ id: e.id, at: iso(e.ts)!, tenant: e.tenant, kind: e.kind, body: e.body, detail: e.detail ? JSON.parse(e.detail) : {} }));
}

/** Which components have history reconstructed from the chain, and for which period (set by scripts/backfill.ts). */
export async function reconstructed(c: Ctx): Promise<{ from: string; to: string; components: string[]; method: string } | null> {
  const b = await metaGet<{ from: string; to: string; components: string[]; method: string }>(c.db, 'backfill');
  return b ? { from: b.from, to: b.to, components: b.components, method: b.method } : null;
}

async function metaGet<T>(db: D1Database, key: string): Promise<T | null> {
  const r = await db.prepare('SELECT value FROM meta WHERE key = ?').bind(key).first<{ value: string }>();
  return r ? (JSON.parse(r.value) as T) : null;
}

export async function world(c: Ctx, tenant: string): Promise<WorldDetails> {
  const w = WORLDS.find((x) => x.tenant === tenant);
  if (!w) throw new HttpError(404, `unknown world: ${tenant}`);
  const [r, sponsors, cursor, cp, tx] = await Promise.all([
    metaGet<ResolvedWorld>(c.db, `world:${tenant}`),
    metaGet<{ address: string; balanceSui: number | null; active: boolean }[]>(c.db, `sponsors:${tenant}`),
    metaGet<WorldCursor>(c.db, `cursor:${tenant}`),
    c.db
      .prepare("SELECT detail FROM samples WHERE component = 'sui-checkpoints' AND detail IS NOT NULL ORDER BY ts DESC LIMIT 1")
      .first<{ detail: string }>(),
    c.db
      .prepare("SELECT SUM(json_extract(detail, '$.tx')) AS n, COUNT(json_extract(detail, '$.tx')) AS m FROM samples WHERE component = ? AND ts > ?")
      .bind(`${tenant}-game-server`, c.now - 3600_000)
      .first<{ n: number | null; m: number }>(),
  ]);
  const cpd = cp ? JSON.parse(cp.detail) : null;
  return {
    ...envelope(c),
    tenant,
    name: w.name,
    world_package: r?.worldPackage ?? null,
    world_original_id: r?.worldOriginal ?? null,
    upstream_world_package: r?.upstreamWorldPackage ?? null,
    pinned: !!r?.pinned,
    eve_token_package: r?.assetsPackage ?? null,
    world_start_checkpoint: r?.publishCheckpoint != null ? r.publishCheckpoint - 1 : null,
    published_at: r?.publishedAt ?? null,
    publish_digest: r?.publishDigest ?? null,
    current_checkpoint: cpd?.checkpoint ?? null,
    epoch: cpd?.epoch ?? null,
    transactions_last_hour: tx?.m ? Number(tx.n ?? 0) : null,
    transactions_window_minutes: tx?.m ?? 0,
    last_game_server_tx_at: iso(cursor?.lastSponsoredAt),
    last_game_server_tx_digest: cursor?.lastSponsoredDigest ?? null,
    admin_acl: r?.adminAcl ?? null,
    sponsors: (sponsors ?? []).map((s) => ({ address: s.address, balance_sui: s.balanceSui, active: s.active })),
    world_api: w.worldApi,
    resolved_at: iso(r?.resolvedAt),
  };
}

export async function gaps(c: Ctx, tenant: string, days: number) {
  const w = WORLDS.find((x) => x.tenant === tenant);
  if (!w) throw new HttpError(404, `unknown world: ${tenant}`);
  const { results } = await c.db
    .prepare('SELECT day, buckets, n, max_gap FROM gap_hist WHERE tenant = ? AND day >= ? ORDER BY day')
    .bind(tenant, dayOf(c.now - (days - 1) * 86400_000))
    .all<{ day: string; buckets: string; n: number; max_gap: number }>();
  const hists: GapHist[] = results.map((r) => ({ buckets: JSON.parse(r.buckets), n: r.n, max: r.max_gap }));
  const h = mergeHists(hists);
  return {
    ...envelope(c),
    tenant,
    days_with_data: results.length,
    gaps: h.n,
    p50_sec: quantile(h, 0.5),
    p99_sec: quantile(h, 0.99),
    p999_sec: quantile(h, 0.999),
    max_sec: h.n ? h.max : null,
    bucket_upper_edges_sec: [...GAP_EDGES, null],
    buckets: h.buckets,
    thresholds: w.heartbeat,
    suggested: results.length >= 14 ? suggestThresholds(h) : null,
    note: results.length >= 14 ? 'Suggested from at least 14 days of data.' : `Needs 14 days of data before suggesting thresholds (have ${results.length}).`,
  };
}

/** Fixed-size buckets of raw samples for some components over the last `minutes`. */
async function bucketsFor(c: Ctx, components: string[], minutes: number, bucketMinutes: number, everyMessage: boolean): Promise<Record<string, Bucket[]>> {
  const { start, size, n } = bucketWindow(c.now, minutes, bucketMinutes);
  const ph = components.map(() => '?').join(',');
  const [agg, problems] = await Promise.all([
    c.db
      .prepare(
        `SELECT component, CAST((ts - ?) / ? AS INTEGER) AS b, status, COUNT(*) AS n, SUM(latency_ms) AS lat_sum, COUNT(latency_ms) AS lat_n
         FROM samples WHERE ts >= ? AND component IN (${ph}) GROUP BY component, b, status`,
      )
      .bind(start, size, start, ...components)
      .all<AggRow & { component: string }>(),
    // Messages explain the bad buckets; in the 1-hour view every minute gets its message.
    c.db
      .prepare(
        `SELECT component, ts, status, message FROM samples WHERE ts >= ? AND component IN (${ph}) ${everyMessage ? '' : "AND status != 'operational'"} ORDER BY ts DESC LIMIT 3000`,
      )
      .bind(start, ...components)
      .all<ProblemRow & { component: string }>(),
  ]);
  return Object.fromEntries(
    components.map((id) => [
      id,
      buildBuckets(
        start,
        size,
        n,
        agg.results.filter((r) => r.component === id),
        problems.results.filter((r) => r.component === id),
      ),
    ]),
  );
}

/** One component: 1 h by minute, 6 h by 5 min, 24 h by 15 min, 7 d by hour. */
export async function samples(c: Ctx, component: string, range: string): Promise<{ range: RangeKey; bucket_minutes: number; buckets: Bucket[] }> {
  if (!(range in RANGES)) throw new HttpError(400, `range must be one of ${Object.keys(RANGES).join(', ')}`);
  const r = RANGES[range as RangeKey];
  const buckets = (await bucketsFor(c, [component], r.minutes, r.bucketMinutes, range === '1h'))[component];
  return { range: range as RangeKey, bucket_minutes: r.bucketMinutes, buckets };
}

/** Every component over the last 24 hours, one bucket per hour: the overview's "24 hours" view. */
export async function recent(c: Ctx): Promise<{ hours: number; bucket_minutes: number; components: Record<string, Bucket[]> }> {
  return { hours: 24, bucket_minutes: 60, components: await bucketsFor(c, COMPONENTS.map((x) => x.id), 24 * 60, 60, false) };
}

// ── RSS ─────────────────────────────────────────────────────────────────────────

const xml = (s: string) => s.replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[ch]!);

export async function rss(c: Ctx, origin: string): Promise<string> {
  const [list, evs] = await Promise.all([incidents(c, null, 50), events(c, 20)]);
  const items = [
    ...list.map((i) => ({
      at: i.updates[0]?.at ?? i.started_at,
      title: `${i.status === 'resolved' ? 'Resolved: ' : ''}${i.title}`,
      link: `${origin}/status/history#incident-${i.id}`,
      guid: `incident-${i.id}-${i.updates.length}`,
      body: i.updates.map((u) => `${u.at} (${u.author}): ${u.body}`).join('\n'),
    })),
    ...evs.map((e) => ({ at: e.at, title: e.kind === 'world_redeployed' ? 'World redeployed' : 'World upgraded', link: `${origin}/status/chain`, guid: `event-${e.id}`, body: e.body })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>EVE Frontier Status: incidents</title>
<link>${origin}/status</link>
<atom:link href="${origin}/status/feeds/incidents.rss" rel="self" type="application/rss+xml"/>
<description>Incidents and world redeploys for EVE Frontier's Stillness and Utopia worlds, detected automatically.</description>
<lastBuildDate>${new Date(c.now).toUTCString()}</lastBuildDate>
${items
  .map(
    (i) => `<item><title>${xml(i.title)}</title><link>${xml(i.link)}</link><guid isPermaLink="false">${xml(i.guid)}</guid><pubDate>${new Date(i.at).toUTCString()}</pubDate><description>${xml(i.body)}</description></item>`,
  )
  .join('\n')}
</channel>
</rss>`;
}

// ── Subscriptions ───────────────────────────────────────────────────────────────

const randomId = (bytes: number) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function subscribe(c: Ctx, body: any, ipHash: string) {
  const url = validWebhookUrl(body?.url);
  if (!url) throw new HttpError(400, 'url must be a public https URL');
  const counts = await c.db
    .prepare('SELECT (SELECT COUNT(*) FROM subscribers WHERE active = 1) AS total, (SELECT COUNT(*) FROM subscribers WHERE ip_hash = ? AND created_at > ?) AS mine')
    .bind(ipHash, c.now - 86400_000)
    .first<{ total: number; mine: number }>();
  if ((counts?.total ?? 0) >= MAX_SUBSCRIBERS) throw new HttpError(503, 'subscriber limit reached');
  if ((counts?.mine ?? 0) >= MAX_PER_IP_PER_DAY) throw new HttpError(429, 'too many subscriptions from this address today');
  const id = randomId(8);
  const secret = randomId(24);
  const r = await c.db
    .prepare('INSERT INTO subscribers (id, url, secret, created_at, ip_hash) VALUES (?,?,?,?,?) ON CONFLICT (url) DO NOTHING')
    .bind(id, url.toString(), secret, c.now, ipHash)
    .run();
  if (!r.meta.changes) throw new HttpError(409, 'this url is already subscribed');
  return {
    id,
    url: url.toString(),
    secret,
    note: 'Keep the secret: deliveries carry X-Status-Signature: sha256=HMAC(secret, body), and DELETE /status/api/v1/subscriptions/{id} with Authorization: Bearer <secret> unsubscribes.',
  };
}

export async function unsubscribe(c: Ctx, id: string, auth: string | null) {
  const secret = auth?.replace(/^Bearer\s+/i, '') ?? '';
  const r = await c.db.prepare('DELETE FROM subscribers WHERE id = ? AND secret = ?').bind(id, secret).run();
  if (!r.meta.changes) throw new HttpError(404, 'no such subscription, or wrong secret');
  await c.db.prepare('DELETE FROM deliveries WHERE subscriber = ?').bind(id).run();
  return { ok: true };
}

// ── Admin ───────────────────────────────────────────────────────────────────────

async function timingSafeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const x = new Uint8Array(ha),
    y = new Uint8Array(hb);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

export async function requireAdmin(env: Env, auth: string | null) {
  if (!env.STATUS_ADMIN_TOKEN) throw new HttpError(503, 'admin is not configured (set STATUS_ADMIN_TOKEN)');
  const token = auth?.replace(/^Bearer\s+/i, '') ?? '';
  if (!(await timingSafeEqual(token, env.STATUS_ADMIN_TOKEN))) throw new HttpError(401, 'bad admin token');
}

export async function adminCreateIncident(c: Ctx, body: any) {
  const comp = COMPONENT_BY_ID.get(body?.component);
  if (!comp) throw new HttpError(400, 'component must be a known component id');
  const impact: Level = body?.impact === 'offline' || body?.impact === 'maintenance' ? body.impact : 'degraded';
  const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : `${comp.group} ${comp.name} ${LEVEL_LABEL[impact].toLowerCase()}`;
  const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 4000) : '';
  if (!text) throw new HttpError(400, 'body is required');
  const r = await c.db
    .prepare("INSERT INTO incidents (component, title, impact, status, started_at, automatic) VALUES (?,?,?,'open',?,0) RETURNING id")
    .bind(comp.id, title, impact, c.now)
    .first<{ id: number }>();
  await c.db.prepare("INSERT INTO incident_updates (incident_id, ts, kind, author, body) VALUES (?,?,'detected','admin',?)").bind(r!.id, c.now, text).run();
  return (await incidents(c, null, 1, comp.id))[0];
}

export async function adminAddUpdate(c: Ctx, id: number, body: any, resolve: boolean) {
  const inc = await c.db.prepare('SELECT id, status FROM incidents WHERE id = ?').bind(id).first<{ id: number; status: string }>();
  if (!inc) throw new HttpError(404, 'no such incident');
  const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 4000) : '';
  if (!text) throw new HttpError(400, 'body is required');
  const stmts = [
    c.db.prepare('INSERT INTO incident_updates (incident_id, ts, kind, author, body) VALUES (?,?,?,?,?)').bind(id, c.now, resolve ? 'resolved' : 'update', 'admin', text),
  ];
  if (resolve) stmts.push(c.db.prepare("UPDATE incidents SET status = 'resolved', resolved_at = ? WHERE id = ?").bind(c.now, id));
  await c.db.batch(stmts);
  const { results } = await c.db.prepare('SELECT component FROM incidents WHERE id = ?').bind(id).all<{ component: string }>();
  return (await incidents(c, null, 200, results[0]?.component)).find((i) => i.id === id);
}

export { clampDays };
