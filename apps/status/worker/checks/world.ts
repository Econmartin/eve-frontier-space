// Per world: game server heartbeat, sponsor gas and the World contracts match.
import { normalizeAddress, type MaintenanceWindow, type WorldConfig } from '../config.ts';
import { ProbeError, type Deps } from '../http.ts';
import type { ResolvedWorld, WorldChange } from '../resolve.ts';
import { gql, MIST_PER_SUI, Q, txCheckpoint, txSponsor, txTime, type TxNode } from '../sui.ts';
import { ago, result, type ChainState, type CheckResult } from './types.ts';

/** Carried from one run to the next (stored in meta). Reset when the world's package changes. */
export interface WorldCursor {
  pkg: string;
  /** Transactions up to and including this checkpoint have been counted. */
  checkpoint: number;
  lastSponsoredAt: number | null;
  lastSponsoredDigest: string | null;
  /** sponsor address → last time it paid for a world transaction (epoch ms) */
  seen: Record<string, number>;
}

export interface WorldCheck {
  gameServer: CheckResult;
  sponsorGas: CheckResult;
  contracts: CheckResult;
  cursor: WorldCursor | null;
  /** Gaps (seconds) between consecutive sponsored transactions first seen in this run. */
  gaps: number[];
  sponsors: { address: string; balanceSui: number | null; active: boolean }[];
}

const ACTIVE_FOR_MS = 24 * 3600_000;
const MAX_FRESH_PAGES = 6;
const MAX_OLDER_PAGES = 2;
/** If the cursor is more than an hour behind (first run, or the cron was stopped), start again from about a minute ago. */
const MAX_CATCHUP_CHECKPOINTS = 4 * 3600;
const RESTART_CHECKPOINTS = 250;

export function inMaintenance(now: number, windows: MaintenanceWindow[]): MaintenanceWindow | null {
  const d = new Date(now);
  for (const w of windows) {
    const [h, m] = w.start.split(':').map(Number);
    // the window may have started yesterday and run past midnight
    for (const back of [0, 1]) {
      const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back, h, m);
      const day = new Date(start).getUTCDay();
      if (w.days && !w.days.includes(day)) continue;
      if (now >= start && now < start + w.minutes * 60_000) return w;
    }
  }
  return null;
}

export function classifyHeartbeat(ageSec: number, t: WorldConfig['heartbeat']): 'operational' | 'degraded' | 'offline' {
  if (ageSec < t.degradedAfterSec) return 'operational';
  if (ageSec <= t.offlineAfterSec) return 'degraded';
  return 'offline';
}

export function classifyBalance(sui: number, t: WorldConfig['sponsorGas']): 'operational' | 'degraded' | 'offline' {
  if (sui < t.emptySui) return 'offline';
  if (sui < t.lowSui) return 'degraded';
  return 'operational';
}

export function checkContracts(w: WorldConfig, r: ResolvedWorld | null, change: WorldChange | null): CheckResult {
  const id = `${w.tenant}-contracts`;
  if (!r) return result(id, 'unknown', 'Packages not resolved yet: Published.toml has not been read.');
  if (!r.upstreamWorldPackage) return result(id, 'unknown', 'Could not read the upstream Published.toml.');
  const detail = { checking: r.worldPackage, upstream: r.upstreamWorldPackage, pinned: r.pinned };
  if (r.worldPackage === r.upstreamWorldPackage) {
    if (change)
      return result(id, 'operational', `World ${change.kind === 'world_redeployed' ? 'redeployed' : 'upgraded'}: now checking ${short(change.to)}`, { detail });
    return result(id, 'operational', `Checking ${short(r.worldPackage)}, as listed in [published.${w.publishedKey}]`, { detail });
  }
  return result(
    id,
    'degraded',
    `Mismatch: the monitor checks ${short(r.worldPackage)} but Published.toml lists ${short(r.upstreamWorldPackage)}. The world was redeployed${r.pinned ? ' and this monitor is pinned to the old package' : ''}.`,
    { detail },
  );
}

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export async function checkWorld(
  deps: Deps,
  w: WorldConfig,
  r: ResolvedWorld | null,
  change: WorldChange | null,
  chain: ChainState | null,
  prev: WorldCursor | null,
): Promise<WorldCheck> {
  const gsId = `${w.tenant}-game-server`;
  const gasId = `${w.tenant}-sponsor-gas`;
  const contracts = checkContracts(w, r, change);
  const unknown = (why: string): WorldCheck => ({
    gameServer: result(gsId, 'unknown', why),
    sponsorGas: result(gasId, 'unknown', why),
    contracts,
    cursor: prev,
    gaps: [],
    sponsors: [],
  });
  if (!r) return unknown('World packages not resolved yet.');
  if (!chain) return unknown('Not checked: the Sui GraphQL endpoint did not answer.');
  if (!r.sponsorTable) return unknown('Could not find the world’s AdminACL on chain.');

  const now = deps.now();
  const pkg = r.worldPackage;
  const same = prev?.pkg === pkg;
  let after = same ? prev!.checkpoint : chain.checkpoint - RESTART_CHECKPOINTS;
  if (chain.checkpoint - after > MAX_CATCHUP_CHECKPOINTS) after = chain.checkpoint - RESTART_CHECKPOINTS;
  const restarted = !same || after !== prev!.checkpoint;
  const before = chain.checkpoint + 1;

  let sponsors: string[];
  let recent: TxNode[];
  let fresh: TxNode[];
  let cursorCp = chain.checkpoint;
  let older = { has: false, start: null as string | null };
  try {
    const { value: d } = await gql<any>(deps, Q.worldLive({ pkg, sponsorTable: r.sponsorTable, afterCheckpoint: after, beforeCheckpoint: before }));
    sponsors = (d.sponsors?.dynamicFields?.nodes ?? [])
      .map((n: any) => n?.name?.json)
      .filter((a: unknown): a is string => typeof a === 'string')
      .map(normalizeAddress);
    recent = d.recent?.nodes ?? [];
    older = { has: !!d.recent?.pageInfo?.hasPreviousPage, start: d.recent?.pageInfo?.startCursor ?? null };
    fresh = [...(d.fresh?.nodes ?? [])];
    let page = d.fresh?.pageInfo;
    let pages = 1;
    while (page?.hasNextPage && pages < MAX_FRESH_PAGES) {
      const { value: n } = await gql<any>(deps, Q.freshPage({ pkg, afterCheckpoint: after, beforeCheckpoint: before, after: page.endCursor }));
      fresh.push(...(n.fresh?.nodes ?? []));
      page = n.fresh?.pageInfo;
      pages++;
    }
    if (page?.hasNextPage && fresh.length) {
      // Too many to read in one run: count whole checkpoints only and pick up the rest next minute.
      const top = Math.max(...fresh.map(txCheckpoint));
      fresh = fresh.filter((t) => txCheckpoint(t) < top);
      cursorCp = top - 1;
    }
  } catch (e) {
    const msg = e instanceof ProbeError ? e.message : String(e);
    return unknown(`Not checked: ${msg}`);
  }

  const sponsorSet = new Set(sponsors);
  const sponsored = (t: TxNode) => {
    const s = txSponsor(t);
    return !!s && sponsorSet.has(normalizeAddress(s));
  };

  // Newest sponsored transaction, paging back a little if the latest 50 were all paid by someone else.
  const seen: Record<string, number> = same ? { ...prev!.seen } : {};
  const all = [...recent, ...fresh];
  for (const t of all) {
    const s = txSponsor(t);
    const at = txTime(t);
    if (s && sponsorSet.has(normalizeAddress(s)) && Number.isFinite(at)) seen[normalizeAddress(s)] = Math.max(seen[normalizeAddress(s)] ?? 0, at);
  }
  let newest = all.filter(sponsored).sort((a, b) => txTime(b) - txTime(a))[0] ?? null;
  let oldestSeen = Math.min(...all.map(txTime).filter(Number.isFinite));
  for (let i = 0; !newest && older.has && older.start && i < MAX_OLDER_PAGES; i++) {
    try {
      const { value: o } = await gql<any>(deps, Q.olderPage({ pkg, before: older.start }));
      const nodes: TxNode[] = o.recent?.nodes ?? [];
      newest = nodes.filter(sponsored).sort((a, b) => txTime(b) - txTime(a))[0] ?? null;
      oldestSeen = Math.min(oldestSeen, ...nodes.map(txTime).filter(Number.isFinite));
      older = { has: !!o.recent?.pageInfo?.hasPreviousPage, start: o.recent?.pageInfo?.startCursor ?? null };
    } catch {
      break;
    }
  }

  let lastAt = newest ? txTime(newest) : null;
  let lastDigest: string | null = newest?.digest ?? null;
  if (same && prev!.lastSponsoredAt && (!lastAt || prev!.lastSponsoredAt > lastAt)) {
    lastAt = prev!.lastSponsoredAt;
    lastDigest = prev!.lastSponsoredDigest;
  }

  // Gaps between sponsored transactions that are new in this run.
  const gaps: number[] = [];
  let p = same && !restarted ? prev!.lastSponsoredAt : null;
  for (const at of fresh.filter(sponsored).map(txTime).filter(Number.isFinite).sort((a, b) => a - b)) {
    if (p != null && at > p) gaps.push((at - p) / 1000);
    if (p == null || at > p) p = at;
  }

  // Game server
  let gameServer: CheckResult;
  const txCount = fresh.length;
  const gsDetail = {
    tx: txCount,
    restarted,
    last_tx_at: lastAt ? new Date(lastAt).toISOString() : null,
    last_tx_digest: lastDigest,
    checkpoint: chain.checkpoint,
  };
  if (lastAt == null) {
    const lowerBound = Number.isFinite(oldestSeen) ? (now - oldestSeen) / 1000 : Infinity;
    const st = lowerBound > w.heartbeat.offlineAfterSec ? 'offline' : 'unknown';
    gameServer = result(
      gsId,
      st,
      all.length ? `No sponsored world transaction in the latest ${all.length}; the newest is at least ${ago(lowerBound)} old` : 'No world transactions found for this package',
      { detail: gsDetail },
    );
  } else {
    const age = (now - lastAt) / 1000;
    gameServer = result(gsId, classifyHeartbeat(age, w.heartbeat), `Last sponsored transaction ${ago(age)} ago`, { detail: gsDetail });
  }

  // Sponsor gas
  const active = Object.entries(seen)
    .filter(([, at]) => now - at < ACTIVE_FOR_MS)
    .map(([a]) => a);
  let balances = new Map<string, number | null>();
  let sponsorGas: CheckResult;
  if (!sponsors.length) {
    sponsorGas = result(gasId, 'offline', 'The AdminACL lists no sponsors, so no transaction can be sponsored.');
  } else {
    try {
      const list = sponsors.slice(0, 20);
      const { value: b } = await gql<any>(deps, Q.balances(list));
      list.forEach((a, i) => {
        const v = b[`b${i}`]?.balance?.totalBalance;
        balances.set(a, v == null ? null : Number(v) / MIST_PER_SUI);
      });
      const graded = (active.length ? active : sponsors).filter((a) => balances.get(a) != null);
      if (!graded.length) {
        sponsorGas = result(gasId, 'unknown', 'Could not read sponsor balances.');
      } else {
        const lowest = graded.reduce((m, a) => (balances.get(a)! < balances.get(m)! ? a : m));
        const sui = balances.get(lowest)!;
        const st = classifyBalance(sui, w.sponsorGas);
        const who = active.length ? `${active.length} active sponsor${active.length > 1 ? 's' : ''}` : `${graded.length} sponsor${graded.length > 1 ? 's' : ''} (none active in 24 h)`;
        sponsorGas = result(gasId, st, `${who}; lowest holds ${fmtSui(sui)} SUI${st === 'degraded' ? ' (low)' : st === 'offline' ? ' (empty)' : ''}`, {
          detail: { balances: Object.fromEntries(balances), active, lowest },
        });
      }
    } catch (e) {
      sponsorGas = result(gasId, 'unknown', `Not checked: ${e instanceof ProbeError ? e.message : String(e)}`);
    }
  }

  // The chain stalled, not the game: anything read from it cannot be trusted.
  if (!chain.healthy) {
    for (const c of [gameServer, sponsorGas]) {
      if (c.status !== 'operational') {
        c.message = `Chain stalled, so this cannot be judged. ${c.message}`;
        c.status = 'unknown';
      }
    }
  }
  const mw = inMaintenance(now, w.maintenance);
  if (mw && gameServer.status !== 'operational' && gameServer.status !== 'unknown') {
    gameServer.status = 'maintenance';
    gameServer.message = `Scheduled downtime (${mw.start} UTC, ${mw.minutes} min). ${gameServer.message}`;
  }

  return {
    gameServer,
    sponsorGas,
    contracts,
    cursor: { pkg, checkpoint: cursorCp, lastSponsoredAt: lastAt, lastSponsoredDigest: lastDigest, seen: pruneSeen(seen, now) },
    gaps,
    sponsors: sponsors.map((a) => ({ address: a, balanceSui: balances.get(a) ?? null, active: active.includes(a) })),
  };
}

function pruneSeen(seen: Record<string, number>, now: number) {
  return Object.fromEntries(Object.entries(seen).filter(([, at]) => now - at < 7 * ACTIVE_FOR_MS));
}

const fmtSui = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(n >= 1 ? 2 : 4));
