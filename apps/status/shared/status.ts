// Status levels and API shapes shared by the Worker and the page.

export const LEVELS = ['operational', 'degraded', 'offline', 'maintenance', 'unknown'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<Level, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  offline: 'Offline',
  maintenance: 'Maintenance',
  unknown: 'Unknown',
};

/** How bad a level is, for picking the worst of several. Unknown sits below Degraded: not knowing is not an outage. */
export const SEVERITY: Record<Level, number> = {
  operational: 0,
  unknown: 1,
  maintenance: 2,
  degraded: 3,
  offline: 4,
};

export function worst(levels: Iterable<Level>): Level {
  let w: Level = 'operational';
  for (const l of levels) if (SEVERITY[l] > SEVERITY[w]) w = l;
  return w;
}

export const isBad = (l: Level) => l === 'degraded' || l === 'offline';

export type Counts = Record<Level, number>;
export const emptyCounts = (): Counts => ({ operational: 0, degraded: 0, offline: 0, maintenance: 0, unknown: 0 });

/**
 * Uptime for a set of one-minute samples. Offline minutes count as down, Degraded minutes as up (the service
 * answered, just slowly or late). Unknown and Maintenance minutes are left out. Null when no minute was measured.
 */
export function uptimeOf(c: Counts): number | null {
  const known = c.operational + c.degraded + c.offline;
  if (!known) return null;
  return (c.operational + c.degraded) / known;
}

/** Worst level present in a day's counts; 'unknown' when nothing but Unknown was recorded. */
export function worstOf(c: Counts): Level | null {
  const present = LEVELS.filter((l) => c[l] > 0);
  return present.length ? worst(present) : null;
}

export interface ComponentInfo {
  id: string;
  group: string;
  name: string;
  description: string;
  world?: string;
}

export interface ComponentStatus extends ComponentInfo {
  status: Level;
  message: string;
  checked_at: string | null;
  latency_ms: number | null;
}

export interface Envelope {
  generated_at: string;
  stale: boolean;
}

export interface Summary extends Envelope {
  status: Level;
  description: string;
  counts: Counts;
  last_sample_at: string | null;
  groups: { name: string; components: ComponentStatus[] }[];
}

export interface DayRollup {
  date: string; // YYYY-MM-DD (UTC)
  uptime: number | null; // 0..1
  worst: Level | null;
  counts: Counts;
  incident_ids: number[];
}

export interface IncidentUpdate {
  id: number;
  at: string;
  kind: 'detected' | 'update' | 'impact' | 'resolved';
  author: 'monitor' | 'admin';
  body: string;
}

export interface Incident {
  id: number;
  component: string;
  component_name: string;
  title: string;
  impact: Level;
  status: 'open' | 'resolved';
  started_at: string;
  resolved_at: string | null;
  automatic: boolean;
  updates: IncidentUpdate[];
}

/** History before live monitoring began, rebuilt from the chain for some components (null when there is none). */
export interface Reconstructed {
  from: string;
  to: string;
  components: string[];
  method: string;
}

export interface WorldEvent {
  id: number;
  at: string;
  tenant: string;
  kind: 'world_redeployed';
  body: string;
  detail: Record<string, unknown>;
}

export interface Sponsor {
  address: string;
  balance_sui: number | null;
  active: boolean;
}

export interface WorldDetails extends Envelope {
  tenant: string;
  name: string;
  world_package: string | null;
  world_original_id: string | null;
  upstream_world_package: string | null;
  pinned: boolean;
  eve_token_package: string | null;
  world_start_checkpoint: number | null;
  published_at: string | null;
  publish_digest: string | null;
  current_checkpoint: number | null;
  epoch: number | null;
  transactions_last_hour: number | null;
  transactions_window_minutes: number;
  last_game_server_tx_at: string | null;
  last_game_server_tx_digest: string | null;
  admin_acl: string | null;
  sponsors: Sponsor[];
  world_api: string | null;
  resolved_at: string | null;
}

/** Short ranges built from the raw one-minute samples (kept 14 days). The 90-day view uses daily rollups instead. */
export const RANGES = {
  '1h': { label: '1 hour', minutes: 60, bucketMinutes: 1 },
  '6h': { label: '6 hours', minutes: 360, bucketMinutes: 5 },
  '24h': { label: '24 hours', minutes: 1440, bucketMinutes: 15 },
  '7d': { label: '7 days', minutes: 10080, bucketMinutes: 60 },
} as const;
export type RangeKey = keyof typeof RANGES;

export interface Bucket {
  start: string; // ISO, UTC
  minutes: number;
  counts: Counts;
  uptime: number | null;
  worst: Level | null;
  /** Mean latency of the samples that had one (GraphQL endpoint, World API). */
  latency_ms: number | null;
  /** The newest check message at the bucket's worst level (Operational messages only in the 1-hour view). */
  message: string | null;
}
