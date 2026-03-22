/**
 * assemblyId.ts
 *
 * Utilities for resolving EVE Frontier smart assembly IDs.
 *
 * Background
 * ----------
 * When the EVE Frontier game client opens a dapp, it appends two URL params:
 *   ?itemId=<in-game integer ID>&tenant=<tenant name>
 *
 * The in-game item ID is a simple integer that identifies the assembly inside
 * the game. Every assembly also exists as an object on the Sui blockchain with
 * a 0x-prefixed hex address (the "chain object ID"). That chain ID is NOT
 * passed directly in the URL — it must be derived.
 *
 * Derivation process (mirrors @evefrontier/dapp-kit)
 * ---------------------------------------------------
 * 1. Fetch the AssemblyRegistry singleton address from the Sui GraphQL API.
 *    This is a shared on-chain object that acts as a lookup registry.
 *
 * 2. BCS-encode a TenantItemId struct: { id: u64, tenant: string }
 *    BCS (Binary Canonical Serialisation) is Sui's standard binary encoding.
 *
 * 3. Call deriveObjectID(registryAddress, typeTag, encodedKey).
 *    This is a deterministic hash — no network call needed for step 3.
 *    The result is the Sui object address for the assembly.
 */

import { bcs } from '@mysten/sui/bcs';
import { deriveObjectID } from '@mysten/sui/utils';

// ---------------------------------------------------------------------------
// Config helpers — read from Vite env vars
// ---------------------------------------------------------------------------

/** Fully-qualified Move type of the ObjectRegistry singleton on chain. */
function getObjectRegistryType(worldPkgId: string): string {
  return `${worldPkgId}::object_registry::ObjectRegistry`;
}

/** Move type tag used when deriving a child object ID from a TenantItemId. */
function getTenantItemIdTypeTag(worldPkgId: string): string {
  return `${worldPkgId}::in_game_id::TenantItemId`;
}

// ---------------------------------------------------------------------------
// Step 1 — fetch the AssemblyRegistry address from the Sui GraphQL API
// ---------------------------------------------------------------------------

/** In-memory cache so we only query the registry address once per page load. */
let registryAddressCache: string | null = null;

/**
 * Fetches the AssemblyRegistry singleton address from the Sui GraphQL API.
 * Result is cached for the lifetime of the page.
 */
async function getRegistryAddress(
  worldPkgId: string,
  graphqlEndpoint: string,
): Promise<string> {
  if (registryAddressCache) return registryAddressCache;

  const query = `
    query GetSingletonObjectByType($object_type: String) {
      objects(filter: { type: $object_type }, first: 1) {
        nodes { address }
      }
    }
  `;

  const res = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { object_type: getObjectRegistryType(worldPkgId) },
    }),
  });

  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);

  const json = await res.json();
  const address: string | undefined = json.data?.objects?.nodes?.[0]?.address;

  if (!address) {
    throw new Error(
      `AssemblyRegistry not found for package ${worldPkgId}. ` +
      `Check VITE_EVE_WORLD_PACKAGE_ID and VITE_SUI_GRAPHQL_ENDPOINT.`,
    );
  }

  registryAddressCache = address;
  return address;
}

// ---------------------------------------------------------------------------
// Step 2 + 3 — BCS-encode TenantItemId, then deterministically derive the ID
// ---------------------------------------------------------------------------

/**
 * Derives the Sui chain object ID for a smart assembly from its in-game
 * item ID and tenant name.
 *
 * @param itemId  - In-game integer item ID (as a string, from ?itemId= URL param)
 * @param tenant  - Tenant name (from ?tenant= URL param, defaults to "testevenet")
 * @param worldPkgId    - VITE_EVE_WORLD_PACKAGE_ID
 * @param graphqlEndpoint - VITE_SUI_GRAPHQL_ENDPOINT
 * @returns The 0x-prefixed Sui object address for this assembly
 */
export async function deriveChainObjectId(
  itemId: string,
  tenant: string,
  worldPkgId: string,
  graphqlEndpoint: string,
): Promise<string> {
  // Step 1 — get the registry address (cached after first call)
  const registryAddress = await getRegistryAddress(worldPkgId, graphqlEndpoint);

  // Step 2 — BCS-encode the TenantItemId key
  // The struct layout must exactly match the Move definition:
  //   struct TenantItemId has copy, drop, store { id: u64, tenant: String }
  const tenantItemIdType = bcs.struct('TenantItemId', {
    id: bcs.u64(),
    tenant: bcs.string(),
  });
  const encodedKey = tenantItemIdType
    .serialize({ id: BigInt(itemId), tenant })
    .toBytes();

  // Step 3 — deterministic derivation (no network call)
  const chainObjectId = deriveObjectID(
    registryAddress,
    getTenantItemIdTypeTag(worldPkgId),
    encodedKey,
  );

  return chainObjectId;
}
