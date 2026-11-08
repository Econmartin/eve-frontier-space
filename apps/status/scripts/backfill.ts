// Reconstructs status history from the chain for the period before live monitoring started, and writes it as SQL.
//
//   node apps/status/scripts/backfill.ts --from 2026-09-29T00:00:00Z --to 2026-11-08T10:21:02Z --out backfill.sql
//   npx wrangler d1 execute eve-frontier-status --remote --file=backfill.sql
//
// What it can reconstruct, minute by minute, using the same thresholds and incident rules as the live checks:
//   - sui-checkpoints: from checkpoint timestamps, sampled every ~10 minutes and drilled into wherever a stall is possible
//   - <world>-game-server: from every sponsored world transaction (5-minute windows, latest 50 transactions each)
// Everything else (GraphQL endpoint, World API, contracts, sponsor gas) was not being probed and stays "no data".
//
// Output: rollups for whole days before the `--to` day, raw samples for the `--to` day itself (so the daily reconcile
// keeps them), incidents found, heartbeat gap histograms, and a meta 'backfill' record the API exposes.
import { writeFileSync } from 'node:fs';
import { emptyCounts, LEVEL_LABEL, type Counts, type Level } from '../shared/status.ts';
import { classifyCheckpointAge } from '../worker/checks/chain.ts';
import { classifyHeartbeat } from '../worker/checks/world.ts';
import { COMPONENT_BY_ID, normalizeAddress, WORLDS } from '../worker/config.ts';
import { addGaps, emptyHist, type GapHist } from '../worker/gaps.ts';
import { liveDeps } from '../worker/http.ts';
import { decide } from '../worker/incidents.ts';
import { fetchUpstream, resolveWorld } from '../worker/resolve.ts';
import { gql } from '../worker/sui.ts';

const arg = (k: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const FROM = Date.parse(arg('from') ?? '2026-09-29T00:00:00Z');
const TO = Date.parse(arg('to') ?? '');
const OUT = arg('out') ?? 'backfill.sql';
const FIRST_INCIDENT_ID = Number(arg('first-incident-id') ?? 1000);
if (!Number.isFinite(TO) || TO <= FROM) throw new Error('--to must be an ISO time after --from (use the first live sample time)');

const deps = liveDeps();
const MIN = 60_000;
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const log = (...a: unknown[]) => console.error(new Date().toISOString().slice(11, 19), ...a);

async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/** gql with patient retries: this is a long, one-off scan. */
async function query<T = any>(q: string): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return (await gql<T>(deps, q)).value;
    } catch (e) {
      deps.backoff.clear();
      if (i >= 6) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

// ── Checkpoints ────────────────────────────────────────────────────────────────

async function checkpointTimes(seqs: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  const chunks: number[][] = [];
  for (let i = 0; i < seqs.length; i += 25) chunks.push(seqs.slice(i, i + 25));
  await pool(chunks, 4, async (c) => {
    const d = await query<any>(`{ ${c.map((s, i) => `c${i}: checkpoint(sequenceNumber: ${s}) { timestamp }`).join(' ')} }`);
    c.forEach((s, i) => d[`c${i}`]?.timestamp && out.set(s, Date.parse(d[`c${i}`].timestamp)));
  });
  return out;
}

async function checkpointAt(ts: number, lo: number, hi: number): Promise<number> {
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const t = (await checkpointTimes([mid])).get(mid)!;
    if (t <= ts) lo = mid;
    else hi = mid;
  }
  return lo;
}

interface Calibration {
  points: [number, number][]; // [sequence, timestamp], ascending
  stalls: [number, number][]; // [start, end] epoch ms: no checkpoint in between
}

async function calibrate(): Promise<Calibration> {
  const latest = await query<any>('{ checkpoint { sequenceNumber } }');
  const top = Number(latest.checkpoint.sequenceNumber);
  const lo = await checkpointAt(FROM - 10 * MIN, 387_000_000, top);
  const hi = (await checkpointAt(TO + 10 * MIN, lo, top)) + 1;
  log(`checkpoints ${lo}..${hi}`);
  const STEP = 2400; // ~10 minutes at ~4 checkpoints a second
  const seqs: number[] = [];
  for (let s = lo; s < hi; s += STEP) seqs.push(s);
  seqs.push(hi);
  const t = await checkpointTimes(seqs);
  const pts = seqs.filter((s) => t.has(s)).map((s) => [s, t.get(s)!] as [number, number]);
  // Where 2400 checkpoints took clearly longer than usual, look closer for a gap of a minute or more.
  const rates = pts.slice(1).map(([s, ts], i) => (s - pts[i][0]) / ((ts - pts[i][1]) / 1000)).sort((a, b) => a - b);
  const median = rates[Math.floor(rates.length / 2)];
  const suspicious = pts.slice(1).flatMap(([s, ts], i) => ((ts - pts[i][1]) / 1000 > (s - pts[i][0]) / median + 30 ? [[pts[i][0], s] as [number, number]] : []));
  log(`median ${median.toFixed(2)} checkpoints/s; ${suspicious.length} intervals to inspect`);
  const stalls: [number, number][] = [];
  for (const [a, b] of suspicious) {
    const fine: number[] = [];
    for (let s = a; s <= b; s += 50) fine.push(s);
    const ft = await checkpointTimes(fine);
    const fp = fine.filter((s) => ft.has(s)).map((s) => [s, ft.get(s)!] as [number, number]);
    for (let i = 1; i < fp.length; i++) if (fp[i][1] - fp[i - 1][1] > 60_000) stalls.push([fp[i - 1][1], fp[i][1]]);
  }
  log(`${stalls.length} stalls of a minute or more`, stalls.map(([a, b]) => `${new Date(a).toISOString()} +${Math.round((b - a) / 1000)}s`));
  return { points: pts, stalls };
}

/** Time of a checkpoint number, interpolated between calibration points. */
function timeAt(cal: Calibration, seq: number): number {
  const p = cal.points;
  let i = p.findIndex(([s]) => s > seq);
  if (i <= 0) i = i === 0 ? 1 : p.length - 1;
  const [s0, t0] = p[i - 1];
  const [s1, t1] = p[i];
  return t0 + ((seq - s0) / (s1 - s0)) * (t1 - t0);
}

/** Checkpoint number at a time, interpolated between calibration points. */
function seqAt(cal: Calibration, ts: number): number {
  const p = cal.points;
  let i = p.findIndex(([, t]) => t > ts);
  if (i <= 0) i = i === 0 ? 1 : p.length - 1;
  const [s0, t0] = p[i - 1];
  const [s1, t1] = p[i];
  return Math.round(s0 + ((ts - t0) / (t1 - t0)) * (s1 - s0));
}

function checkpointStatus(cal: Calibration, at: number): { status: Level; age: number } {
  const stall = cal.stalls.find(([a, b]) => at >= a && at < b);
  const age = stall ? (at - stall[0]) / 1000 : 1;
  return { status: classifyCheckpointAge(age), age };
}

// ── World transactions ─────────────────────────────────────────────────────────

async function sponsoredTimes(cal: Calibration, pkg: string, sponsors: Set<string>) {
  const WIN = 5 * MIN;
  const wins: [number, number][] = [];
  for (let t = FROM - 60 * MIN; t < TO; t += WIN) wins.push([seqAt(cal, t) - 200, seqAt(cal, t + WIN) + 200]);
  const chunks: [number, number][][] = [];
  for (let i = 0; i < wins.length; i += 12) chunks.push(wins.slice(i, i + 12));
  const seen = new Map<string, { t: number; payer: string }>();
  // Windows with more than 50 transactions only return their latest 50: the stretch before those is unread.
  const unread: [number, number][] = [];
  let truncated = 0;
  let done = 0;
  await pool(chunks, 4, async (c) => {
    const d = await query<any>(
      `{ ${c
        .map(
          ([a, b], i) =>
            `w${i}: transactions(last: 50, filter: { function: "${pkg}", afterCheckpoint: ${a}, beforeCheckpoint: ${b} }) { pageInfo { hasPreviousPage } nodes { digest gasInput { gasSponsor { address } } effects { timestamp } } }`,
        )
        .join(' ')} }`,
    );
    c.forEach(([a], i) => {
      const w = d[`w${i}`];
      if (w?.pageInfo?.hasPreviousPage) {
        truncated++;
        const ts = (w.nodes ?? []).map((n: any) => Date.parse(n.effects?.timestamp)).filter(Number.isFinite);
        const startMs = cal.points.length ? timeAt(cal, a) : 0;
        if (ts.length) unread.push([startMs, Math.min(...ts)]);
      }
      for (const n of w?.nodes ?? []) {
        const payer = n.gasInput?.gasSponsor?.address;
        if (n.effects?.timestamp && payer) seen.set(n.digest, { t: Date.parse(n.effects.timestamp), payer: normalizeAddress(payer) });
      }
    });
    if (++done % 100 === 0) log(`  ${pkg.slice(0, 8)}: ${done}/${chunks.length} batches`);
  });
  const payers = new Map<string, number>();
  for (const { payer } of seen.values()) payers.set(payer, (payers.get(payer) ?? 0) + 1);
  const times = [...seen.values()].filter((x) => sponsors.has(x.payer)).map((x) => x.t).sort((a, b) => a - b);
  return { times, payers, truncated, unread, windows: wins.length, total: seen.size };
}

// ── Assemble ───────────────────────────────────────────────────────────────────

interface Series {
  component: string;
  minutes: { at: number; status: Level; message: string }[];
}

function incidentsFrom(series: Series, firstId: number) {
  const out: { id: number; component: string; title: string; impact: Level; started: number; resolved: number; updates: [number, string, string][] }[] = [];
  let open: (typeof out)[number] | null = null;
  const recent: Level[] = [];
  const c = COMPONENT_BY_ID.get(series.component)!;
  const name = `${c.world ? c.group + ' ' : ''}${c.name}`;
  for (const m of series.minutes) {
    recent.unshift(m.status);
    if (recent.length > 20) recent.pop();
    const d = decide(recent, open ? { impact: open.impact, automatic: true } : null);
    if (d.action === 'open') {
      open = {
        id: firstId + out.length,
        component: series.component,
        title: `${name} ${LEVEL_LABEL[d.impact].toLowerCase()}`,
        impact: d.impact,
        started: m.at,
        resolved: 0,
        updates: [[m.at, 'detected', `Reconstructed from chain history: ${m.message}`]],
      };
      out.push(open);
    } else if (d.action === 'escalate' && open) {
      open.impact = d.impact;
      open.title = `${name} ${LEVEL_LABEL[d.impact].toLowerCase()}`;
      open.updates.push([m.at, 'impact', `Reconstructed from chain history: now ${LEVEL_LABEL[d.impact].toLowerCase()}: ${m.message}`]);
    } else if (d.action === 'close' && open) {
      open.resolved = m.at;
      open.updates.push([m.at, 'resolved', 'Reconstructed from chain history: back to normal for 5 minutes in a row.']);
      open = null;
    }
  }
  if (open) {
    open.resolved = TO;
    open.updates.push([TO, 'resolved', 'Reconstructed from chain history: live monitoring started and found it working.']);
  }
  return out;
}

const sql = (v: unknown) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

async function main() {
  log(`backfill ${new Date(FROM).toISOString()} -> ${new Date(TO).toISOString()}`);
  const cal = await calibrate();
  const upstream = await fetchUpstream(deps);
  const minutes: number[] = [];
  for (let t = Math.ceil(FROM / MIN) * MIN; t < TO; t += MIN) minutes.push(t + 2000); // live samples land ~2 s past the minute

  const series: Series[] = [];
  const chain = minutes.map((at) => checkpointStatus(cal, at));
  series.push({
    component: 'sui-checkpoints',
    minutes: minutes.map((at, i) => ({ at, status: chain[i].status, message: `Checkpoint ${Math.round(chain[i].age)} s old` })),
  });

  const gapRows: { tenant: string; day: string; h: GapHist }[] = [];
  const report: Record<string, unknown> = {};
  for (const w of WORLDS) {
    const { world: r } = await resolveWorld(deps, w, upstream, null, null);
    if (!r?.sponsorTable) throw new Error(`could not resolve ${w.tenant}`);
    const sp = await query<any>(`{ a: address(address: "${r.sponsorTable}") { dynamicFields(first: 50) { nodes { name { json } } } } }`);
    const sponsors = new Set<string>(sp.a.dynamicFields.nodes.map((n: any) => normalizeAddress(n.name.json)));
    log(`${w.tenant}: package ${r.worldPackage.slice(0, 10)}…, ${sponsors.size} sponsors`);
    const s = await sponsoredTimes(cal, r.worldPackage, sponsors);
    report[w.tenant] = {
      transactions: s.total,
      sponsored: s.times.length,
      busyWindows: s.truncated,
      windows: s.windows,
      payers: Object.fromEntries([...s.payers].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a, n]) => [a.slice(0, 10), n])),
    };
    log(w.tenant, report[w.tenant]);
    if (!s.times.length) continue;
    const first = s.times[0];
    let j = 0;
    const ms: Series['minutes'] = [];
    minutes.forEach((at, i) => {
      if (at < first) return; // the world was not live yet: leave as no data
      while (j + 1 < s.times.length && s.times[j + 1] <= at) j++;
      const age = (at - s.times[j]) / 1000;
      let status: Level = classifyHeartbeat(age, w.heartbeat);
      let message = `Last sponsored transaction ${age < 90 ? Math.round(age) + ' s' : Math.round(age / 60) + ' min'} ago`;
      if (chain[i].status !== 'operational' && status !== 'operational') {
        status = 'unknown';
        message = `Chain stalled, so this cannot be judged. ${message}`;
      }
      ms.push({ at, status, message });
    });
    series.push({ component: `${w.tenant}-game-server`, minutes: ms });
    // Gap histograms for whole days before the --to day (the live monitor owns that day's row).
    const byDay = new Map<string, number[]>();
    for (let k = 1; k < s.times.length; k++) {
      const t = s.times[k];
      if (t < FROM || dayOf(t) >= dayOf(TO)) continue;
      const g = (t - s.times[k - 1]) / 1000;
      // A gap that touches an unread stretch of a busy window is not a real gap: leave it out of the histogram.
      if (s.unread.some(([a, b]) => s.times[k - 1] < b && t > a)) continue;
      if (g > 0) byDay.set(dayOf(t), [...(byDay.get(dayOf(t)) ?? []), g]);
    }
    for (const [day, gs] of byDay) gapRows.push({ tenant: w.tenant, day, h: addGaps(emptyHist(), gs) });
  }

  // SQL
  const lines: string[] = [`-- Status backfill ${new Date(FROM).toISOString()} .. ${new Date(TO).toISOString()}, generated ${new Date().toISOString()}`];
  const today = dayOf(TO);
  const incidents = series.flatMap((s, k) => incidentsFrom(s, FIRST_INCIDENT_ID + k * 1000));
  for (const s of series) {
    const days = new Map<string, Counts>();
    for (const m of s.minutes) {
      const c = days.get(dayOf(m.at)) ?? emptyCounts();
      c[m.status]++;
      days.set(dayOf(m.at), c);
    }
    for (const [day, c] of days) {
      lines.push(
        `INSERT INTO rollups (component, day, operational, degraded, offline, maintenance, unknown) VALUES (${[s.component, day, c.operational, c.degraded, c.offline, c.maintenance, c.unknown].map(sql).join(', ')}) ON CONFLICT (component, day) DO UPDATE SET operational = operational + excluded.operational, degraded = degraded + excluded.degraded, offline = offline + excluded.offline, maintenance = maintenance + excluded.maintenance, unknown = unknown + excluded.unknown;`,
      );
    }
    // The --to day keeps raw samples, so tomorrow's reconcile (which rebuilds yesterday from samples) keeps these minutes.
    const todays = s.minutes.filter((m) => dayOf(m.at) === today);
    for (let i = 0; i < todays.length; i += 200) {
      lines.push(
        `INSERT OR IGNORE INTO samples (component, ts, status, latency_ms, message, detail) VALUES ${todays
          .slice(i, i + 200)
          .map((m) => `(${[s.component, m.at, m.status, null, m.message, '{"backfill":true}'].map(sql).join(', ')})`)
          .join(', ')};`,
      );
    }
  }
  for (const i of incidents) {
    lines.push(`INSERT INTO incidents (id, component, title, impact, status, started_at, resolved_at, automatic) VALUES (${[i.id, i.component, i.title, i.impact, 'resolved', i.started, i.resolved, 1].map(sql).join(', ')});`);
    for (const [at, kind, body] of i.updates) lines.push(`INSERT INTO incident_updates (incident_id, ts, kind, author, body) VALUES (${[i.id, at, kind, 'monitor', body].map(sql).join(', ')});`);
  }
  for (const g of gapRows) lines.push(`INSERT OR REPLACE INTO gap_hist (tenant, day, buckets, n, max_gap) VALUES (${[g.tenant, g.day, JSON.stringify(g.h.buckets), g.h.n, g.h.max].map(sql).join(', ')});`);
  const meta = {
    from: new Date(FROM).toISOString(),
    to: new Date(TO).toISOString(),
    components: series.map((s) => s.component),
    method: 'Reconstructed from Sui testnet history: checkpoint timestamps and sponsored world transactions, with the live thresholds and incident rules.',
    generated_at: new Date().toISOString(),
  };
  lines.push(`INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES ('backfill', ${sql(JSON.stringify(meta))}, ${Date.now()});`);
  writeFileSync(OUT, lines.join('\n') + '\n');

  const summary = series.map((s) => {
    const c = emptyCounts();
    for (const m of s.minutes) c[m.status]++;
    return { component: s.component, minutes: s.minutes.length, ...c };
  });
  console.log(JSON.stringify({ out: OUT, statements: lines.length, summary, incidents: incidents.map((i) => ({ id: i.id, title: i.title, from: new Date(i.started).toISOString(), mins: Math.round((i.resolved - i.started) / MIN) })), stalls: cal.stalls.length, report }, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
