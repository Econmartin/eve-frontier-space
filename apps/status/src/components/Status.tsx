import { LEVEL_LABEL, type Level } from '../../shared/status.ts';

/**
 * Pixel-art status glyphs on a 9x9 grid. Each level has its own silhouette, so the shape alone tells them apart:
 * check, triangle with "!", bold X, hollow diamond, question mark.
 */
const GLYPHS: Record<Level, string[]> = {
  operational: [
    '.........',
    '........#',
    '.......##',
    '#.....##.',
    '##...##..',
    '.##.##...',
    '..###....',
    '...#.....',
    '.........',
  ],
  degraded: [
    '....#....',
    '...###...',
    '...#.#...',
    '..##.##..',
    '.###.###.',
    '.#######.',
    '####.####',
    '#########',
    '.........',
  ],
  offline: [
    '##.....##',
    '###...###',
    '.###.###.',
    '..#####..',
    '...###...',
    '..#####..',
    '.###.###.',
    '###...###',
    '##.....##',
  ],
  maintenance: [
    '....#....',
    '...###...',
    '..##.##..',
    '.##...##.',
    '##.....##',
    '.##...##.',
    '..##.##..',
    '...###...',
    '....#....',
  ],
  unknown: [
    '..#####..',
    '.##...##.',
    '.##...##.',
    '.....##..',
    '....##...',
    '....##...',
    '.........',
    '....##...',
    '....##...',
  ],
};

function PixelGlyph({ rows, size, className }: { rows: string[]; size: number; className: string }) {
  const rects: React.ReactElement[] = [];
  rows.forEach((row, y) => [...row].forEach((c, x) => c === '#' && rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />)));
  return (
    <svg aria-hidden="true" viewBox="0 0 9 9" width={size} height={size} shapeRendering="crispEdges" fill="currentColor" className={className}>
      {rects}
    </svg>
  );
}

const TEXT: Record<Level, string> = {
  operational: 'text-operational',
  degraded: 'text-degraded',
  offline: 'text-offline',
  maintenance: 'text-maintenance',
  unknown: 'text-unknown',
};

/** Sizes snap to whole pixels of the 9x9 grid (18, 27, 36…) so the pixels stay crisp. */
export function StatusIcon({ level, size = 18, className = '' }: { level: Level; size?: number; className?: string }) {
  const snapped = Math.max(9, Math.round(size / 9) * 9);
  return <PixelGlyph rows={GLYPHS[level]} size={snapped} className={`${TEXT[level]} shrink-0 ${className}`} />;
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
