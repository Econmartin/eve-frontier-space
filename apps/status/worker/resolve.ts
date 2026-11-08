// Resolves each world's packages from the upstream Published.toml files and its slow-changing chain facts
// (AdminACL, tenant, publish transaction). Runs every six hours, or when nothing is stored yet.
import { PUBLISHED_TOML, normalizeAddress, type WorldConfig } from './config.ts';
import { probe, type Deps } from './http.ts';
import { gql, Q } from './sui.ts';

export interface PublishedEntry {
  publishedAt: string;
  originalId: string;
  version: number | null;
}

/** Just enough TOML for Published.toml: [published.<env>] sections with key = "value" lines. */
export function parsePublishedToml(text: string): Record<string, PublishedEntry> {
  const out: Record<string, PublishedEntry> = {};
  let section: string | null = null;
  let cur: Record<string, string> = {};
  const flush = () => {
    if (section && cur['published-at']) {
      out[section] = {
        publishedAt: normalizeAddress(cur['published-at']),
        originalId: normalizeAddress(cur['original-id'] ?? cur['published-at']),
        version: cur.version ? Number(cur.version) : null,
      };
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const sec = line.match(/^\[published\.([A-Za-z0-9_-]+)\]$/);
    if (sec) {
      flush();
      section = sec[1];
      cur = {};
      continue;
    }
    if (line.startsWith('[')) {
      flush();
      section = null;
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"?([^"]*)"?$/);
    if (kv && section) cur[kv[1]] = kv[2];
  }
  flush();
  return out;
}

export interface Upstream {
  world: Record<string, PublishedEntry>;
  assets: Record<string, PublishedEntry>;
  fetchedAt: number;
}

export async function fetchUpstream(deps: Deps): Promise<Upstream> {
  const get = (url: string) =>
    probe(deps, url, { headers: { accept: 'text/plain' } }, (t) => {
      const parsed = parsePublishedToml(t);
      if (!Object.keys(parsed).length) throw new Error('no [published.*] sections');
      return parsed;
    }).then((r) => r.value);
  const [world, assets] = await Promise.all([get(PUBLISHED_TOML.world), get(PUBLISHED_TOML.assets)]);
  return { world, assets, fetchedAt: deps.now() };
}

export interface ResolvedWorld {
  tenant: string;
  /** Package the checks call against (function filter). */
  worldPackage: string;
  /** Package that defines the world's types (AdminACL, Character). Same as worldPackage until an upgrade. */
  worldOriginal: string;
  assetsPackage: string | null;
  pinned: boolean;
  upstreamWorldPackage: string | null;
  upstreamWorldOriginal: string | null;
  upstreamFetchedAt: number | null;
  adminAcl: string | null;
  sponsorTable: string | null;
  chainTenant: string | null;
  publishDigest: string | null;
  publishedAt: string | null;
  publishCheckpoint: number | null;
  resolvedAt: number;
}

export type WorldChange =
  | { kind: 'world_redeployed'; from: string; to: string }
  | { kind: 'world_upgraded'; from: string; to: string };

/**
 * Builds the world's resolved record. `upstream` may be null when GitHub could not be read; the previous record is
 * then kept for the packages. Returns the change, if the upstream package moved since the previous record.
 */
export async function resolveWorld(
  deps: Deps,
  w: WorldConfig,
  upstream: Upstream | null,
  prev: ResolvedWorld | null,
  pin: string | null,
): Promise<{ world: ResolvedWorld | null; change: WorldChange | null }> {
  const up = upstream?.world[w.publishedKey] ?? null;
  const upAssets = upstream?.assets[w.publishedKey] ?? null;
  const upstreamWorldPackage = up?.publishedAt ?? prev?.upstreamWorldPackage ?? null;
  const upstreamWorldOriginal = up?.originalId ?? prev?.upstreamWorldOriginal ?? null;

  let change: WorldChange | null = null;
  if (up && prev?.upstreamWorldOriginal && prev.upstreamWorldOriginal !== up.originalId) {
    change = { kind: 'world_redeployed', from: prev.upstreamWorldOriginal, to: up.originalId };
  } else if (up && prev?.upstreamWorldPackage && prev.upstreamWorldPackage !== up.publishedAt) {
    change = { kind: 'world_upgraded', from: prev.upstreamWorldPackage, to: up.publishedAt };
  }

  const worldPackage = pin ?? upstreamWorldPackage;
  const worldOriginal = pin ?? upstreamWorldOriginal;
  if (!worldPackage || !worldOriginal) return { world: null, change };

  const base: ResolvedWorld = {
    tenant: w.tenant,
    worldPackage,
    worldOriginal,
    assetsPackage: pin ? null : (upAssets?.publishedAt ?? prev?.assetsPackage ?? null),
    pinned: !!pin,
    upstreamWorldPackage,
    upstreamWorldOriginal,
    upstreamFetchedAt: upstream?.fetchedAt ?? prev?.upstreamFetchedAt ?? null,
    adminAcl: null,
    sponsorTable: null,
    chainTenant: null,
    publishDigest: null,
    publishedAt: null,
    publishCheckpoint: null,
    resolvedAt: deps.now(),
  };
  // Keep the chain facts we already have for the same package if the chain read below fails.
  if (prev && prev.worldOriginal === worldOriginal) {
    Object.assign(base, {
      adminAcl: prev.adminAcl,
      sponsorTable: prev.sponsorTable,
      chainTenant: prev.chainTenant,
      publishDigest: prev.publishDigest,
      publishedAt: prev.publishedAt,
      publishCheckpoint: prev.publishCheckpoint,
    });
  }

  try {
    const { value: d } = await gql<any>(deps, Q.worldStatic({ original: worldOriginal }));
    // A world has one AdminACL; if there were ever more, take the one with the most sponsors.
    const acls = (d.acl?.nodes ?? [])
      .map((n: any) => ({ address: n.address, json: n.asMoveObject?.contents?.json }))
      .filter((a: any) => a.json?.authorized_sponsors?.id)
      .sort((a: any, b: any) => Number(b.json.authorized_sponsors.size ?? 0) - Number(a.json.authorized_sponsors.size ?? 0));
    if (acls[0]) {
      base.adminAcl = normalizeAddress(acls[0].address);
      base.sponsorTable = normalizeAddress(acls[0].json.authorized_sponsors.id);
    }
    const tenant = d.character?.nodes?.[0]?.asMoveObject?.contents?.json?.key?.tenant;
    if (typeof tenant === 'string') base.chainTenant = tenant;
    const ptx = d.pkg?.previousTransaction;
    if (ptx?.effects?.checkpoint) {
      base.publishDigest = ptx.digest;
      base.publishedAt = ptx.effects.timestamp;
      base.publishCheckpoint = Number(ptx.effects.checkpoint.sequenceNumber);
    }
  } catch {
    // keep whatever we had; the minute checks will report Unknown for anything missing
  }
  return { world: base, change };
}
