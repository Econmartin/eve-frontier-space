// When to open, escalate and close an incident, from a component's recent samples. Pure, so it can be tested.
import { isBad, SEVERITY, worst, type Level } from '../shared/status.ts';
import { INCIDENT_CLOSE_AFTER, INCIDENT_OPEN_AFTER } from './config.ts';

export type Decision =
  | { action: 'open'; impact: Level }
  | { action: 'escalate'; impact: Level }
  | { action: 'close' }
  | { action: 'none' };

/**
 * `recent` is newest first. Unknown and Maintenance samples are skipped: they neither open nor close an incident,
 * so a probe failure in the middle of an outage does not split it in two.
 */
export function decide(recent: Level[], open: { impact: Level; automatic: boolean } | null): Decision {
  const known = recent.filter((l) => l !== 'unknown' && l !== 'maintenance');
  if (!open) {
    const last = known.slice(0, INCIDENT_OPEN_AFTER);
    if (last.length === INCIDENT_OPEN_AFTER && last.every(isBad)) return { action: 'open', impact: worst(last) };
    return { action: 'none' };
  }
  const lastGood = known.slice(0, INCIDENT_CLOSE_AFTER);
  if (open.automatic && lastGood.length === INCIDENT_CLOSE_AFTER && lastGood.every((l) => l === 'operational')) return { action: 'close' };
  if (known[0] && isBad(known[0]) && SEVERITY[known[0]] > SEVERITY[open.impact]) return { action: 'escalate', impact: known[0] };
  return { action: 'none' };
}
