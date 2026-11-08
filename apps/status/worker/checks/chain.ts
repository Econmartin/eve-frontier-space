// Sui testnet: the GraphQL endpoint and checkpoint freshness, both from one checkpoint query.
import { CHECKPOINT_THRESHOLDS, PROBE } from '../config.ts';
import { ProbeError, type Deps } from '../http.ts';
import { gql, Q } from '../sui.ts';
import { ago, result, type ChainState, type CheckResult } from './types.ts';

export interface ChainCheck {
  graphql: CheckResult;
  checkpoints: CheckResult;
  chain: ChainState | null;
  /** The GraphQL failure was a network-level one (used to tell our own outage from theirs). */
  networkFailure: boolean;
}

export function classifyCheckpointAge(ageSec: number): 'operational' | 'degraded' | 'offline' {
  if (ageSec < CHECKPOINT_THRESHOLDS.degradedAfterSec) return 'operational';
  if (ageSec <= CHECKPOINT_THRESHOLDS.offlineAfterSec) return 'degraded';
  return 'offline';
}

export async function checkChain(deps: Deps): Promise<ChainCheck> {
  let data: any, ms: number, attempts: number;
  try {
    ({ value: data, ms, attempts } = await gql(deps, Q.checkpoint));
  } catch (e) {
    const err = e instanceof ProbeError ? e : new ProbeError('network', String(e));
    const ours = err.isOurs;
    return {
      graphql: result('sui-graphql', ours ? 'unknown' : 'offline', ours ? `Not checked: ${err.message}` : `${err.message} (${err.attempts} tries)`, {
        detail: { kind: err.kind, attempts: err.attempts },
      }),
      checkpoints: result('sui-checkpoints', 'unknown', 'Could not read the latest checkpoint: the GraphQL endpoint did not answer.'),
      chain: null,
      networkFailure: err.kind === 'network' || err.kind === 'timeout',
    };
  }

  const graphql = result(
    'sui-graphql',
    ms < PROBE.slowMs ? 'operational' : 'degraded',
    ms < PROBE.slowMs ? `Answered in ${ms} ms` : `Slow: answered in ${(ms / 1000).toFixed(1)} s`,
    { latencyMs: ms, detail: { attempts } },
  );
  if (attempts > 1 && graphql.status === 'operational') graphql.message += ` after ${attempts} tries`;

  const cp = data?.checkpoint;
  const seq = Number(cp?.sequenceNumber);
  const at = Date.parse(cp?.timestamp);
  if (!Number.isFinite(seq) || !Number.isFinite(at)) {
    return {
      graphql,
      checkpoints: result('sui-checkpoints', 'unknown', 'The checkpoint answer had no sequence number or timestamp.'),
      chain: null,
      networkFailure: false,
    };
  }
  const ageSec = (deps.now() - at) / 1000;
  const status = classifyCheckpointAge(ageSec);
  const checkpoints = result('sui-checkpoints', status, `Checkpoint ${seq.toLocaleString('en-US')}, ${ago(ageSec)} old`, {
    detail: { checkpoint: seq, epoch: cp.epoch?.epochId ?? null, timestamp: cp.timestamp, age_sec: Math.round(ageSec) },
  });
  return {
    graphql,
    checkpoints,
    chain: { checkpoint: seq, checkpointAt: at, epoch: cp.epoch?.epochId ?? null, healthy: status === 'operational' },
    networkFailure: false,
  };
}
