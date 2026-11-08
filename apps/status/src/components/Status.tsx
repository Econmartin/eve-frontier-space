import { CircleCheck, CircleHelp, OctagonX, TriangleAlert, Wrench } from 'lucide-react';
import { LEVEL_LABEL, type Level } from '../../shared/status.ts';

/** Lucide, like the rest of the site. Each level has its own shape: check circle, triangle, octagon, wrench, question. */
const ICON = {
  operational: CircleCheck,
  degraded: TriangleAlert,
  offline: OctagonX,
  maintenance: Wrench,
  unknown: CircleHelp,
} as const;

const TEXT: Record<Level, string> = {
  operational: 'text-operational',
  degraded: 'text-degraded',
  offline: 'text-offline',
  maintenance: 'text-maintenance',
  unknown: 'text-unknown',
};

export function StatusIcon({ level, size = 18, className = '' }: { level: Level; size?: number; className?: string }) {
  const I = ICON[level];
  return <I aria-hidden="true" size={size} strokeWidth={2.25} className={`${TEXT[level]} shrink-0 ${className}`} />;
}

export function StatusLabel({ level, className = '' }: { level: Level; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${TEXT[level]} ${className}`}>
      <StatusIcon level={level} size={16} />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export const segClass = (l: Level | null) => (l ? `seg seg-${l}` : 'seg seg-nodata');

export function Legend() {
  const items: (Level | null)[] = ['operational', 'degraded', 'offline', 'maintenance', 'unknown', null];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend for the uptime bars">
      {items.map((l) => (
        <li key={l ?? 'none'} className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-3.5 w-2 items-end" aria-hidden="true">
            <span className={segClass(l)} />
          </span>
          {l ? LEVEL_LABEL[l] : 'No data'}
        </li>
      ))}
    </ul>
  );
}
