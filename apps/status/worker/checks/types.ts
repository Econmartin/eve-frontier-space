import type { Level } from '../../shared/status.ts';

export interface CheckResult {
  component: string;
  status: Level;
  message: string;
  latencyMs?: number | null;
  detail?: Record<string, unknown>;
}

export interface ChainState {
  checkpoint: number;
  checkpointAt: number; // epoch ms
  epoch: number | null;
  /** True when checkpoints are fresh: world checks can trust what the chain says. */
  healthy: boolean;
}

export const result = (component: string, status: Level, message: string, extra: Partial<CheckResult> = {}): CheckResult => ({
  component,
  status,
  message,
  ...extra,
});

export function ago(sec: number): string {
  if (!Number.isFinite(sec)) return 'never';
  if (sec < 90) return `${Math.max(0, Math.round(sec))} s`;
  if (sec < 5400) return `${Math.round(sec / 60)} min`;
  if (sec < 172800) return `${(sec / 3600).toFixed(1)} h`;
  return `${Math.round(sec / 86400)} days`;
}
