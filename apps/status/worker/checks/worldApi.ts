// World API: GET /health must answer {"ok":true}.
import { PROBE } from '../config.ts';
import { probe, ProbeError, type Deps } from '../http.ts';
import { result, type CheckResult } from './types.ts';

export interface WorldApiCheck extends CheckResult {
  networkFailure: boolean;
}

export async function checkWorldApi(deps: Deps, tenant: string, base: string): Promise<WorldApiCheck> {
  const id = `${tenant}-world-api`;
  try {
    const { ms, attempts } = await probe(deps, `${base}/health`, { headers: { accept: 'application/json' } }, (text) => {
      const j = JSON.parse(text);
      if (j?.ok !== true) throw new Error(`health answered ${text.slice(0, 80)}`);
      return j;
    });
    const slow = ms >= PROBE.slowMs;
    return {
      ...result(id, slow ? 'degraded' : 'operational', slow ? `Slow: healthy after ${(ms / 1000).toFixed(1)} s` : `Healthy in ${ms} ms`, {
        latencyMs: ms,
        detail: { attempts },
      }),
      networkFailure: false,
    };
  } catch (e) {
    const err = e instanceof ProbeError ? e : new ProbeError('network', String(e));
    if (err.isOurs) return { ...result(id, 'unknown', `Not checked: ${err.message}`), networkFailure: false };
    return {
      ...result(id, 'offline', `${err.message} (${err.attempts} tries)`, { detail: { kind: err.kind, attempts: err.attempts } }),
      networkFailure: err.kind === 'network' || err.kind === 'timeout',
    };
  }
}
