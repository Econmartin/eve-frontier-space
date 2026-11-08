// Sui GraphQL client and the queries the monitor uses. Field names verified against graphql.testnet.sui.io on 8 Nov 2026.
import { SUI_GRAPHQL } from './config.ts';
import { probe, ProbeError, type Deps, type Timed } from './http.ts';

export async function gql<T = any>(deps: Deps, query: string, opts: { tries?: number } = {}): Promise<Timed<T>> {
  return probe<T>(
    deps,
    SUI_GRAPHQL,
    { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ query }) },
    (text) => {
      const j = JSON.parse(text);
      if (j.errors?.length) throw new ProbeError('body', `GraphQL error: ${String(j.errors[0]?.message).slice(0, 200)}`);
      if (!j.data) throw new ProbeError('body', 'GraphQL answer has no data');
      return j.data as T;
    },
    opts,
  );
}

export const Q = {
  checkpoint: `{ checkpoint { sequenceNumber timestamp epoch { epochId } } }`,

  /** Everything per world that changes minute to minute, in one round trip. */
  worldLive: (p: { pkg: string; sponsorTable: string; afterCheckpoint: number; beforeCheckpoint: number; after?: string }) => `{
  sponsors: address(address: "${p.sponsorTable}") { dynamicFields(first: 50) { nodes { name { json } } } }
  recent: transactions(last: 50, filter: { function: "${p.pkg}" }) {
    pageInfo { hasPreviousPage startCursor }
    nodes { digest gasInput { gasSponsor { address } } effects { timestamp checkpoint { sequenceNumber } } }
  }
  fresh: transactions(first: 50, ${p.after ? `after: "${p.after}", ` : ''}filter: { function: "${p.pkg}", afterCheckpoint: ${p.afterCheckpoint}, beforeCheckpoint: ${p.beforeCheckpoint} }) {
    pageInfo { hasNextPage endCursor }
    nodes { digest gasInput { gasSponsor { address } } effects { timestamp checkpoint { sequenceNumber } } }
  }
}`,

  freshPage: (p: { pkg: string; afterCheckpoint: number; beforeCheckpoint: number; after: string }) => `{
  fresh: transactions(first: 50, after: "${p.after}", filter: { function: "${p.pkg}", afterCheckpoint: ${p.afterCheckpoint}, beforeCheckpoint: ${p.beforeCheckpoint} }) {
    pageInfo { hasNextPage endCursor }
    nodes { digest gasInput { gasSponsor { address } } effects { timestamp checkpoint { sequenceNumber } } }
  }
}`,

  olderPage: (p: { pkg: string; before: string }) => `{
  recent: transactions(last: 50, before: "${p.before}", filter: { function: "${p.pkg}" }) {
    pageInfo { hasPreviousPage startCursor }
    nodes { digest gasInput { gasSponsor { address } } effects { timestamp checkpoint { sequenceNumber } } }
  }
}`,

  balances: (addrs: string[]) =>
    `{ ${addrs.map((a, i) => `b${i}: address(address: "${a}") { balance(coinType: "0x2::sui::SUI") { totalBalance } }`).join('\n')} }`,

  /** Slow-changing facts, read every six hours. */
  worldStatic: (p: { original: string }) => `{
  acl: objects(filter: { type: "${p.original}::access::AdminACL" }, first: 5) { nodes { address asMoveObject { contents { json } } } }
  character: objects(filter: { type: "${p.original}::character::Character" }, first: 1) { nodes { asMoveObject { contents { json } } } }
  pkg: object(address: "${p.original}") { previousTransaction { digest effects { timestamp checkpoint { sequenceNumber } } } }
}`,
};

export interface TxNode {
  digest: string;
  gasInput: { gasSponsor: { address: string } | null } | null;
  effects: { timestamp: string | null; checkpoint: { sequenceNumber: number } | null } | null;
}

export const txSponsor = (t: TxNode) => t.gasInput?.gasSponsor?.address?.toLowerCase() ?? null;
export const txTime = (t: TxNode) => (t.effects?.timestamp ? Date.parse(t.effects.timestamp) : NaN);
export const txCheckpoint = (t: TxNode) => Number(t.effects?.checkpoint?.sequenceNumber ?? NaN);

export const MIST_PER_SUI = 1_000_000_000;
