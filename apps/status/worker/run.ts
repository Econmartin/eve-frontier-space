// The cron job: every minute run all checks, store one sample per component, open or close incidents.
// Once a day reconcile yesterday's rollups and prune; every six hours re-resolve packages from Published.toml.
import { LEVEL_LABEL, type Level } from '../shared/status.ts';
import { checkChain } from './checks/chain.ts';
import { result, type CheckResult } from './checks/types.ts';
import { checkWorld, type WorldCursor } from './checks/world.ts';
import { checkWorldApi } from './checks/worldApi.ts';
import { COMPONENTS, COMPONENT_BY_ID, pinnedPackage, RESOLVE_EVERY_MS, RETENTION, WORLDS, type Env } from './config.ts';
import { addGaps, emptyHist, type GapHist } from './gaps.ts';
import { HOURLY_DDL, hourlyFromSamples, hourlyUpsert, HOUR_MS } from './hourly.ts';
import { liveDeps, type Deps } from './http.ts';
import { decide } from './incidents.ts';
import { fetchUpstream, resolveWorld, type ResolvedWorld, type Upstream, type WorldChange } from './resolve.ts';
import { deliverWebhooks, enqueueWebhook } from './webhooks.ts';

export const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export interface Meta {
  get<T>(key: string): T | null;
  set(key: string, value: unknown): void;
  dirty(): [string, string][];
}

export async function loadMeta(db: D1Database): Promise<Meta> {
  const { results } = await db.prepare('SELECT key, value FROM meta').all<{ key: string; value: string }>();
  const m = new Map(results.map((r) => [r.key, r.value]));
  const changed = new Map<string, string>();
  return {
    get: <T>(k: string) => {
      const v = changed.get(k) ?? m.get(k);
      if (v == null) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return null;
      }
    },
    set: (k, v) => void changed.set(k, JSON.stringify(v)),
    // Only keys whose value actually changed: every row written counts against D1's daily write limit.
    dirty: () => [...changed.entries()].filter(([k, v]) => m.get(k) !== v),
  };
}

async function safe<T>(fn: () => Promise<T>, fallback: (e: unknown) => T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error('status check failed', e);
    return fallback(e);
  }
}

export interface RunOutput {
  ts: number;
  results: CheckResult[];
  changes: { tenant: string; change: WorldChange }[];
}

/** Runs every check. No database access, so it can be tested with recorded responses. */
export async function runChecks(
  deps: Deps,
  env: Env,
  state: {
    upstream: Upstream | null;
    worlds: Record<string, ResolvedWorld | null>;
    cursors: Record<string, WorldCursor | null>;
  },
): Promise<RunOutput & { worlds: Record<string, ResolvedWorld | null>; upstream: Upstream | null; cursors: Record<string, WorldCursor | null>; gaps: Record<string, number[]>; sponsors: Record<string, unknown> }> {
  const now = deps.now();
  const changes: { tenant: string; change: WorldChange }[] = [];
  let upstream = state.upstream;
  const worlds = { ...state.worlds };

  // 1. Re-resolve packages every six hours, when a world is missing, or when a pin was added or removed.
  const needResolve =
    !upstream ||
    now - upstream.fetchedAt >= RESOLVE_EVERY_MS ||
    WORLDS.some((w) => {
      const r = worlds[w.tenant];
      const pin = pinnedPackage(env, w.tenant);
      return !r || !r.sponsorTable || r.pinned !== !!pin || (pin && r.worldPackage !== pin);
    });
  if (needResolve) {
    const fresh = !upstream || now - upstream.fetchedAt >= RESOLVE_EVERY_MS ? await safe(() => fetchUpstream(deps), () => null) : upstream;
    if (fresh) upstream = fresh;
    for (const w of WORLDS) {
      const { world, change } = await safe(
        () => resolveWorld(deps, w, fresh, worlds[w.tenant] ?? null, pinnedPackage(env, w.tenant)),
        () => ({ world: worlds[w.tenant] ?? null, change: null }),
      );
      worlds[w.tenant] = world;
      if (change) changes.push({ tenant: w.tenant, change });
    }
  }

  // 2. The chain first: world checks need the current checkpoint and whether the chain is healthy.
  const chain = await safe(
    () => checkChain(deps),
    (e) => ({
      graphql: result('sui-graphql', 'unknown', `Probe error: ${String(e)}`),
      checkpoints: result('sui-checkpoints', 'unknown', `Probe error: ${String(e)}`),
      chain: null,
      networkFailure: false,
    }),
  );

  // 3. Every world in parallel; one failing never stops the others.
  const cursors: Record<string, WorldCursor | null> = { ...state.cursors };
  const gaps: Record<string, number[]> = {};
  const sponsors: Record<string, unknown> = {};
  const apiResults = await Promise.all(
    WORLDS.filter((w) => w.worldApi).map((w) =>
      safe(
        () => checkWorldApi(deps, w.tenant, w.worldApi!),
        (e) => ({ ...result(`${w.tenant}-world-api`, 'unknown', `Probe error: ${String(e)}`), networkFailure: false }),
      ),
    ),
  );
  const worldResults = await Promise.all(
    WORLDS.map((w) =>
      safe(
        async () => {
          const change = changes.find((c) => c.tenant === w.tenant)?.change ?? null;
          const r = await checkWorld(deps, w, worlds[w.tenant] ?? null, change, chain.chain, state.cursors[w.tenant] ?? null);
          cursors[w.tenant] = r.cursor;
          gaps[w.tenant] = r.gaps;
          sponsors[w.tenant] = r.sponsors;
          return [r.gameServer, r.sponsorGas, r.contracts];
        },
        (e) => [
          result(`${w.tenant}-game-server`, 'unknown', `Probe error: ${String(e)}`),
          result(`${w.tenant}-sponsor-gas`, 'unknown', `Probe error: ${String(e)}`),
          result(`${w.tenant}-contracts`, 'unknown', `Probe error: ${String(e)}`),
        ],
      ),
    ),
  );

  let results: CheckResult[] = [chain.checkpoints, chain.graphql, ...apiResults, ...worldResults.flat()];

  // 4. If every outside host failed at the network level at once, the problem is our monitor, not the game.
  if (chain.networkFailure && apiResults.length && apiResults.every((a) => a.networkFailure)) {
    results = results.map((r) => ({ ...r, status: 'unknown' as Level, message: `Our monitor could not reach any service, so nothing was measured. (${r.message})` }));
  }
  for (const r of results) delete (r as any).networkFailure;

  // Every component gets exactly one sample per run.
  const byId = new Map(results.map((r) => [r.component, r]));
  results = COMPONENTS.map((c) => byId.get(c.id) ?? result(c.id, 'unknown', 'No result from this run'));

  return { ts: now, results, changes, worlds, upstream, cursors, gaps, sponsors };
}

/** The whole cron job. */
export async function runCron(env: Env, deps?: Deps): Promise<void> {
  const db = env.STATUS_DB;
  if (!db) {
    console.warn('STATUS_DB not bound; skipping status run');
    return;
  }
  const meta = await loadMeta(db);
  const backoff = new Map<string, number>(Object.entries(meta.get<Record<string, number>>('backoff') ?? {}));
  deps ??= liveDeps(backoff);

  const state = {
    upstream: meta.get<Upstream>('upstream'),
    worlds: Object.fromEntries(WORLDS.map((w) => [w.tenant, meta.get<ResolvedWorld>(`world:${w.tenant}`)])),
    cursors: Object.fromEntries(WORLDS.map((w) => [w.tenant, meta.get<WorldCursor>(`cursor:${w.tenant}`)])),
  };
  const out = await runChecks(deps, env, state);
  const ts = out.ts;
  const day = dayOf(ts);

  // Recent samples (before this run) and open incidents, for the incident decisions.
  // The component list matters: samples' key is (component, ts), so filtering on ts alone scans the whole table, and D1
  // bills every row scanned. Once a minute over 14 days of samples that is hundreds of millions of rows read a day.
  const [recentRows, openRows, histRows] = await Promise.all([
    db
      .prepare(`SELECT component, status FROM samples WHERE component IN (${COMPONENTS.map(() => '?').join(',')}) AND ts > ? ORDER BY ts DESC`)
      .bind(...COMPONENTS.map((c) => c.id), ts - 20 * 60_000)
      .all<{ component: string; status: Level }>(),
    db.prepare("SELECT id, component, impact, automatic FROM incidents WHERE status = 'open'").all<{ id: number; component: string; impact: Level; automatic: number }>(),
    db.prepare('SELECT tenant, buckets, n, max_gap FROM gap_hist WHERE day = ?').bind(day).all<{ tenant: string; buckets: string; n: number; max_gap: number }>(),
  ]);

  // Hourly rollups: the first run after deploy creates and fills them from raw samples (one statement, once). Until that
  // has worked the API keeps reading raw samples, and nothing is added to them, so a failure here never loses a run.
  let hourlyReady = meta.get<boolean>('hourly_ready') === true;
  if (!hourlyReady) {
    hourlyReady = await safe(
      async () => {
        await db.batch([db.prepare(HOURLY_DDL), hourlyFromSamples(db, ts - RETENTION.hourlyDays * 86400_000 - HOUR_MS)]);
        return true;
      },
      () => false,
    );
    if (hourlyReady) meta.set('hourly_ready', true);
  }

  const stmts: D1PreparedStatement[] = [];
  if (hourlyReady) stmts.push(...multiRow(db, ...hourlyUpsert(ts, out.results)));
  // Samples and today's rollups (one minute added to the right status column), as multi-row inserts.
  stmts.push(
    ...multiRow(
      db,
      'INSERT OR REPLACE INTO samples (component, ts, status, latency_ms, message, detail) VALUES',
      '',
      out.results.map((r) => [r.component, ts, r.status, r.latencyMs ?? null, r.message.slice(0, 500), r.detail ? JSON.stringify(r.detail) : null]),
    ),
    ...multiRow(
      db,
      'INSERT INTO rollups (component, day, operational, degraded, offline, maintenance, unknown) VALUES',
      `ON CONFLICT (component, day) DO UPDATE SET operational = operational + excluded.operational, degraded = degraded + excluded.degraded,
         offline = offline + excluded.offline, maintenance = maintenance + excluded.maintenance, unknown = unknown + excluded.unknown`,
      out.results.map((r) => [
        r.component,
        day,
        +(r.status === 'operational'),
        +(r.status === 'degraded'),
        +(r.status === 'offline'),
        +(r.status === 'maintenance'),
        +(r.status === 'unknown'),
      ]),
    ),
  );
  // Gap histograms.
  for (const [tenant, g] of Object.entries(out.gaps)) {
    if (!g.length) continue;
    const row = histRows.results.find((h) => h.tenant === tenant);
    const prev: GapHist = row ? { buckets: JSON.parse(row.buckets), n: row.n, max: row.max_gap } : emptyHist();
    const h = addGaps(prev, g);
    stmts.push(
      db
        .prepare('INSERT OR REPLACE INTO gap_hist (tenant, day, buckets, n, max_gap) VALUES (?,?,?,?,?)')
        .bind(tenant, day, JSON.stringify(h.buckets), h.n, h.max),
    );
  }
  // World redeploys.
  for (const { tenant, change } of out.changes) {
    const w = WORLDS.find((x) => x.tenant === tenant)!;
    const body =
      change.kind === 'world_redeployed'
        ? `${w.name} redeployed: the world package changed from ${change.from} to ${change.to}. Checks now follow the new package.`
        : `${w.name} upgraded: the world package moved from ${change.from} to ${change.to}.`;
    stmts.push(db.prepare('INSERT INTO events (ts, tenant, kind, body, detail) VALUES (?,?,?,?,?)').bind(ts, tenant, change.kind, body, JSON.stringify(change)));
  }

  // Meta: resolved worlds, cursors, backoff, sponsors for the chain panel.
  if (out.upstream) meta.set('upstream', out.upstream);
  for (const w of WORLDS) {
    meta.set(`world:${w.tenant}`, out.worlds[w.tenant]);
    meta.set(`cursor:${w.tenant}`, out.cursors[w.tenant]);
    if (out.sponsors[w.tenant]) meta.set(`sponsors:${w.tenant}`, out.sponsors[w.tenant]);
  }
  meta.set('backoff', Object.fromEntries([...backoff].filter(([, until]) => until > ts)));
  meta.set('last_run', ts);
  const dirty = meta.dirty();
  stmts.push(...multiRow(db, 'INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES', '', dirty.map(([k, v]) => [k, v, ts])));

  // Incidents.
  const recentBy = new Map<string, Level[]>();
  for (const r of recentRows.results) {
    const l = recentBy.get(r.component) ?? [];
    l.push(r.status);
    recentBy.set(r.component, l);
  }
  const events: { kind: string; incident: Record<string, unknown> }[] = [];
  for (const r of out.results) {
    const open = openRows.results.find((o) => o.component === r.component) ?? null;
    const d = decide([r.status, ...(recentBy.get(r.component) ?? [])], open ? { impact: open.impact, automatic: !!open.automatic } : null);
    const c = COMPONENT_BY_ID.get(r.component)!;
    const name = `${c.world ? c.group + ' ' : ''}${c.name}`;
    if (d.action === 'open') {
      const title = `${name} ${LEVEL_LABEL[d.impact].toLowerCase()}`;
      const body = `Detected automatically after 3 failed checks in a row: ${r.message}`;
      // Single statement: create the incident and its first update together.
      stmts.push(
        db
          .prepare("INSERT INTO incidents (component, title, impact, status, started_at, automatic) VALUES (?,?,?,'open',?,1)")
          .bind(r.component, title, d.impact, ts),
        db
          .prepare("INSERT INTO incident_updates (incident_id, ts, kind, author, body) VALUES (last_insert_rowid(), ?, 'detected', 'monitor', ?)")
          .bind(ts, body),
      );
      events.push({ kind: 'incident.opened', incident: { component: r.component, title, impact: d.impact, started_at: new Date(ts).toISOString(), message: body } });
    } else if (d.action === 'escalate' && open) {
      const body = `Now ${LEVEL_LABEL[d.impact].toLowerCase()}: ${r.message}`;
      stmts.push(
        db.prepare('UPDATE incidents SET impact = ? WHERE id = ?').bind(d.impact, open.id),
        db.prepare("INSERT INTO incident_updates (incident_id, ts, kind, author, body) VALUES (?, ?, 'impact', 'monitor', ?)").bind(open.id, ts, body),
      );
      events.push({ kind: 'incident.updated', incident: { id: open.id, component: r.component, impact: d.impact, message: body } });
    } else if (d.action === 'close' && open) {
      const body = 'Resolved automatically after 5 good checks in a row.';
      stmts.push(
        db.prepare("UPDATE incidents SET status = 'resolved', resolved_at = ? WHERE id = ?").bind(ts, open.id),
        db.prepare("INSERT INTO incident_updates (incident_id, ts, kind, author, body) VALUES (?, ?, 'resolved', 'monitor', ?)").bind(open.id, ts, body),
      );
      events.push({ kind: 'incident.resolved', incident: { id: open.id, component: r.component, resolved_at: new Date(ts).toISOString(), message: body } });
    }
  }
  for (const e of events) stmts.push(enqueueWebhook(db, e.kind, e.incident, ts));
  for (const { tenant, change } of out.changes) stmts.push(enqueueWebhook(db, `world.${change.kind.replace('world_', '')}`, { tenant, ...change }, ts));

  await db.batch(stmts);

  // Once a day: reconcile yesterday from raw samples, prune old rows.
  if (meta.get<string>('daily') !== day) {
    await safe(() => runDaily(db, ts), () => undefined);
    await db.prepare("INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES ('daily', ?, ?)").bind(JSON.stringify(day), ts).run();
  }

  await safe(() => deliverWebhooks(db, deps!), () => undefined);
}

/** D1 allows at most 100 bound parameters per statement, so long multi-row inserts are split. */
export function multiRow(db: D1Database, head: string, tail: string, rows: unknown[][]): D1PreparedStatement[] {
  if (!rows.length) return [];
  const per = Math.max(1, Math.floor(100 / rows[0].length));
  const out: D1PreparedStatement[] = [];
  for (let i = 0; i < rows.length; i += per) {
    const chunk = rows.slice(i, i + per);
    const ph = chunk.map((r) => `(${r.map(() => '?').join(',')})`).join(',');
    out.push(db.prepare(`${head} ${ph} ${tail}`).bind(...chunk.flat()));
  }
  return out;
}

export async function runDaily(db: D1Database, now: number) {
  const today = Date.parse(dayOf(now));
  const yStart = today - 86400_000;
  const yDay = dayOf(yStart);
  await db.batch([
    db.prepare('DELETE FROM rollups WHERE day = ?').bind(yDay),
    db
      .prepare(
        `INSERT INTO rollups (component, day, operational, degraded, offline, maintenance, unknown)
         SELECT component, ?, SUM(status='operational'), SUM(status='degraded'), SUM(status='offline'), SUM(status='maintenance'), SUM(status='unknown')
         FROM samples WHERE ts >= ? AND ts < ? GROUP BY component`,
      )
      .bind(yDay, yStart, today),
    db.prepare('DELETE FROM samples WHERE ts < ?').bind(now - RETENTION.samplesDays * 86400_000),
    db.prepare('DELETE FROM rollups WHERE day < ?').bind(dayOf(now - RETENTION.rollupsDays * 86400_000)),
    db.prepare('DELETE FROM hourly WHERE hour < ?').bind(now - RETENTION.hourlyDays * 86400_000 - HOUR_MS),
    db.prepare('DELETE FROM gap_hist WHERE day < ?').bind(dayOf(now - RETENTION.rollupsDays * 86400_000)),
    db.prepare('DELETE FROM deliveries WHERE created_at < ?').bind(now - 2 * 86400_000),
    db.prepare('DELETE FROM subscribe_attempts WHERE ts < ?').bind(now - 2 * 86400_000),
    // Subscriptions switched off after repeated failures are forgotten after 30 days
    db.prepare('DELETE FROM subscribers WHERE active = 0 AND created_at < ?').bind(now - 30 * 86400_000),
  ]);
}
