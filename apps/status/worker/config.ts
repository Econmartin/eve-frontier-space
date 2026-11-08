// Everything the monitor knows up front. Package addresses are NOT here: they are resolved from the upstream
// Published.toml files (see resolve.ts) so a redeploy is picked up without a code change.
import type { ComponentInfo } from '../shared/status.ts';

export const SITE_NAME = 'EVE Frontier Status';
export const USER_AGENT = 'evefrontier.space-status/1.0 (+https://evefrontier.space/status)';

export const SUI_GRAPHQL = 'https://graphql.testnet.sui.io/graphql';
export const PUBLISHED_TOML = {
  world: 'https://raw.githubusercontent.com/evefrontier/world-contracts/main/contracts/world/Published.toml',
  assets: 'https://raw.githubusercontent.com/evefrontier/world-contracts/main/contracts/assets/Published.toml',
};
export const EXPLORER = 'https://suiscan.xyz/testnet';

/** Per outbound request. A response slower than SLOW_MS is Degraded; three failed tries in a row is Offline. */
export const PROBE = { timeoutMs: 10_000, slowMs: 2_000, tries: 3 };

/** Age of the newest checkpoint. */
export const CHECKPOINT_THRESHOLDS = { degradedAfterSec: 60, offlineAfterSec: 300 };

/** Incidents open after this many consecutive bad samples and close after this many good ones. */
export const INCIDENT_OPEN_AFTER = 3;
export const INCIDENT_CLOSE_AFTER = 5;

export const RETENTION = { samplesDays: 14, rollupsDays: 400 };
export const RESOLVE_EVERY_MS = 6 * 3600_000;
export const STALE_AFTER_MS = 3 * 60_000;

export interface MaintenanceWindow {
  /** 0 = Sunday … 6 = Saturday, UTC. Omit for every day. */
  days?: number[];
  /** HH:MM, UTC */
  start: string;
  minutes: number;
}

export interface WorldConfig {
  tenant: string;
  name: string;
  /** Section in Published.toml: [published.<key>] */
  publishedKey: string;
  /** World API base URL, or null when no public host is known (the component is then not shown). */
  worldApi: string | null;
  /** Age of the newest sponsored world transaction. */
  heartbeat: { degradedAfterSec: number; offlineAfterSec: number };
  /** SUI held by each active sponsor. */
  sponsorGas: { lowSui: number; emptySui: number };
  /** Scheduled downtime shown as Maintenance instead of Offline. None found for either world as of 8 Nov 2026. */
  maintenance: MaintenanceWindow[];
}

export const WORLDS: WorldConfig[] = [
  {
    tenant: 'stillness',
    name: 'Stillness',
    publishedKey: 'testnet_stillness',
    worldApi: 'https://world-api-stillness.live.pub.evefrontier.com',
    // From a 4.5 h sample on 8 Nov 2026: median gap 5 s, p99 2 min, longest 7 min. Revisit with /api/v1/worlds/stillness/gaps.
    heartbeat: { degradedAfterSec: 10 * 60, offlineAfterSec: 20 * 60 },
    // ~0.001 SUI per transaction, ~700 transactions an hour: 100 SUI is about six days of gas.
    sponsorGas: { lowSui: 100, emptySui: 0.1 },
    maintenance: [],
  },
  {
    tenant: 'utopia',
    name: 'Utopia',
    publishedKey: 'testnet_utopia',
    // The old Utopia World API host no longer resolves and no replacement is known.
    worldApi: null,
    // Utopia's sponsored transactions arrive every 15 minutes, like a scheduled job.
    heartbeat: { degradedAfterSec: 20 * 60, offlineAfterSec: 45 * 60 },
    sponsorGas: { lowSui: 5, emptySui: 0.1 },
    maintenance: [],
  },
];

export interface Env {
  STATUS_DB?: D1Database;
  STATUS_RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  /** Bearer token for the admin endpoints. Set with `wrangler secret put STATUS_ADMIN_TOKEN`. */
  STATUS_ADMIN_TOKEN?: string;
  /**
   * Pin a world to a package instead of following Published.toml, e.g. STATUS_PIN_STILLNESS=0x8b8a…1aa1.
   * Used to test the mismatch and offline paths; leave unset in production.
   */
  [pin: `STATUS_PIN_${string}`]: string | undefined;
}

export function pinnedPackage(env: Env, tenant: string): string | null {
  const v = env[`STATUS_PIN_${tenant.toUpperCase()}`];
  return typeof v === 'string' && /^0x[0-9a-fA-F]{1,64}$/.test(v.trim()) ? normalizeAddress(v.trim()) : null;
}

export function normalizeAddress(a: string): string {
  const hex = a.toLowerCase().replace(/^0x/, '');
  return '0x' + hex.padStart(64, '0');
}

export const SUI_GROUP = 'Sui testnet';

export function componentList(worlds: WorldConfig[] = WORLDS): ComponentInfo[] {
  const list: ComponentInfo[] = [
    {
      id: 'sui-checkpoints',
      group: SUI_GROUP,
      name: 'Checkpoints',
      description: 'Age of the newest Sui testnet checkpoint. When the chain stalls, world checks that depend on it show Unknown.',
    },
    {
      id: 'sui-graphql',
      group: SUI_GROUP,
      name: 'GraphQL endpoint',
      description: 'Response and latency of graphql.testnet.sui.io, the source for every chain check here.',
    },
  ];
  for (const w of worlds) {
    list.push({
      id: `${w.tenant}-game-server`,
      group: w.name,
      world: w.tenant,
      name: 'Game server',
      description:
        'Age of the newest world transaction paid for by an authorised sponsor. This shows the game server is writing to the chain; it does not prove players can log in.',
    });
    if (w.worldApi) {
      list.push({
        id: `${w.tenant}-world-api`,
        group: w.name,
        world: w.tenant,
        name: 'World API',
        description: `GET ${w.worldApi.replace(/^https?:\/\//, '')}/health answers {"ok":true}.`,
      });
    }
    list.push(
      {
        id: `${w.tenant}-contracts`,
        group: w.name,
        world: w.tenant,
        name: 'World contracts',
        description: `The package the monitor checks matches [published.${w.publishedKey}] in the upstream Published.toml. A mismatch means the world was redeployed.`,
      },
      {
        id: `${w.tenant}-sponsor-gas`,
        group: w.name,
        world: w.tenant,
        name: 'Sponsor gas',
        description: `SUI balance of each sponsor that recently paid for world transactions. Low below ${w.sponsorGas.lowSui} SUI, empty below ${w.sponsorGas.emptySui} SUI.`,
      },
    );
  }
  return list;
}

export const COMPONENTS = componentList();
export const COMPONENT_BY_ID = new Map(COMPONENTS.map((c) => [c.id, c]));
