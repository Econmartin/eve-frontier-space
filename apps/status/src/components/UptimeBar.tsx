import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LEVEL_LABEL, uptimeOf, LEVELS, worst, emptyCounts, type Bucket, type Counts, type DayRollup, type Incident, type Level } from '../../shared/status.ts';
import { formatDay, pct, useMediaQuery, useTimeMode } from '../lib.tsx';
import { segClass } from './Status.tsx';

/** What a day or bucket looks like: its worst measured level; Unknown only when nothing else was measured. */
export function dayLevel(d: { counts: Counts }): Level | null {
  const known = LEVELS.filter((l) => l !== 'unknown' && d.counts[l] > 0);
  if (known.length) return worst(known);
  return d.counts.unknown > 0 ? 'unknown' : null;
}

export interface Segment {
  key: string;
  level: Level | null;
  counts: Counts;
  /** Full sentence for screen readers. */
  label: string;
  /** Tooltip heading and lines. */
  title: string;
  lines: string[];
}

/**
 * One segment per period, oldest on the left. A single Tab stop: arrow keys, Home and End move between segments, and
 * the focused or hovered one shows its details. Every segment has a full text label for screen readers.
 */
export function SegmentBar({
  segments,
  name,
  unit,
  phoneMax,
  startLabel,
  endLabel,
}: {
  segments: Segment[];
  name: string;
  /** e.g. "days", "minutes", for the group label */
  unit: string;
  phoneMax: number;
  startLabel: (shown: number) => string;
  endLabel: string;
}) {
  const phone = useMediaQuery('(max-width: 640px)');
  const shown = phone ? segments.slice(-phoneMax) : segments;
  // Track segments by key, not index: the short ranges refresh every minute and shift by one bucket.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const keyIdx = (k: string | null) => (k == null ? -1 : shown.findIndex((s) => s.key === k));
  const tabStop = keyIdx(focusKey) >= 0 ? keyIdx(focusKey) : shown.length - 1;
  const active = keyIdx(activeKey) >= 0 ? keyIdx(activeKey) : null;

  const total = emptyCounts();
  for (const s of shown) for (const l of LEVELS) total[l] += s.counts[l];
  const overall = uptimeOf(total);

  // Escape hides the details from anywhere, including when they were opened by hovering (WCAG 1.4.13).
  useEffect(() => {
    if (activeKey == null) return;
    const onEsc = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setActiveKey(null);
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [activeKey]);

  const move = (i: number) => {
    const n = Math.max(0, Math.min(shown.length - 1, i));
    const k = shown[n].key;
    setFocusKey(k);
    setActiveKey(k);
    refs.current.get(k)?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') move(i + 1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') move(i - 1);
    else if (k === 'Home') move(0);
    else if (k === 'End') move(shown.length - 1);
    else return;
    e.preventDefault();
  };

  const tip = active != null ? shown[active] : null;
  return (
    // Leaving the bar *and* its details closes them, so the pointer can move onto the details to read them.
    <div className="relative" onMouseLeave={() => setActiveKey(null)}>
      <div
        role="group"
        aria-label={`${name}: ${pct(overall)} uptime over the last ${shown.length} ${unit}. Use the arrow keys to move between ${unit}.`}
        className={`flex h-8 items-stretch ${shown.length > 100 ? 'gap-px' : 'gap-[2px]'}`}
      >
        {shown.map((s, i) => (
          <button
            key={s.key}
            ref={(el) => {
              if (el) refs.current.set(s.key, el);
              else refs.current.delete(s.key);
            }}
            type="button"
            tabIndex={i === tabStop ? 0 : -1}
            aria-label={s.label}
            className="flex min-w-0 flex-1 cursor-default items-end p-0 focus-visible:outline-offset-1"
            onMouseEnter={() => setActiveKey(s.key)}
            onFocus={() => {
              setFocusKey(s.key);
              setActiveKey(s.key);
            }}
            onBlur={() => setActiveKey((a) => (a === s.key ? null : a))}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className={segClass(s.level)} />
          </button>
        ))}
      </div>
      {tip && (
        // pb-2 instead of a margin: the padding bridges the gap so the pointer stays inside while moving up to it.
        <div
          aria-hidden="true"
          className="fade-in absolute bottom-full z-10 w-64 pb-2"
          style={{ left: `clamp(0px, calc(${((active! + 0.5) / shown.length) * 100}% - 8rem), calc(100% - 16rem))` }}
        >
          <div className="rounded-xl bg-surface p-3 text-xs shadow-lg ring-1 ring-line">
            <div className="font-bold">{tip.title}</div>
            {tip.lines.map((l, i) => (
              <div key={i} className={i === 0 ? 'mt-1 text-muted' : 'mt-1.5 break-words'}>
                {l}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-1.5 flex justify-between font-mono text-xs text-muted" aria-hidden="true">
        <span>{startLabel(shown.length)}</span>
        <span>{pct(overall)} uptime</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}

export function levelLine(s: { counts: Counts; uptime: number | null }): string {
  const lvl = dayLevel(s);
  if (!lvl) return 'No data';
  const up = s.uptime == null ? 'Not measured' : `${pct(s.uptime)} uptime`;
  return lvl === 'operational' ? up : `${up} · worst ${LEVEL_LABEL[lvl]}`;
}

/** The 90-day bar: one segment per UTC day. */
export function UptimeBar({ days, name, incidents }: { days: DayRollup[]; name: string; incidents: Map<number, Incident> }) {
  const segments: Segment[] = days.map((d) => {
    const lvl = dayLevel(d);
    const titles = d.incident_ids.map((id) => incidents.get(id)?.title ?? `Incident ${id}`);
    const inc = titles.length ? `${titles.length} incident${titles.length > 1 ? 's' : ''}: ${titles.join('; ')}` : 'no incidents';
    return {
      key: d.date,
      level: lvl,
      counts: d.counts,
      label: [formatDay(d.date) + ' (UTC)', lvl ? (d.uptime == null ? 'uptime not measured' : `${pct(d.uptime)} uptime`) : 'no data', lvl ? `worst: ${LEVEL_LABEL[lvl]}` : null, inc]
        .filter(Boolean)
        .join(', '),
      title: formatDay(d.date),
      lines: [levelLine(d), ...(titles.length ? titles : ['No incidents'])],
    };
  });
  return <SegmentBar segments={segments} name={name} unit="days" phoneMax={30} startLabel={(n) => `${n} days ago`} endLabel="Today" />;
}

/** Formats a bucket's time span in UTC or local time, following the toggle. */
export function useBucketTime() {
  const { mode } = useTimeMode();
  const tz = mode === 'utc' ? 'UTC' : undefined;
  const zone = mode === 'utc' ? ' UTC' : '';
  const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  const day = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' });
  return (b: Bucket, withDay: boolean) => {
    const s = Date.parse(b.start);
    const e = s + b.minutes * 60_000;
    const range = b.minutes === 1 ? hm(s) : `${hm(s)}–${hm(e)}`;
    return `${withDay ? day(s) + ', ' : ''}${range}${zone}`;
  };
}

export function bucketSegments(buckets: Bucket[], fmt: ReturnType<typeof useBucketTime>, withDay: boolean): Segment[] {
  return buckets.map((b) => {
    const lvl = dayLevel(b);
    const when = fmt(b, withDay);
    const lat = b.latency_ms != null ? `mean latency ${b.latency_ms} ms` : null;
    return {
      key: b.start,
      level: lvl,
      counts: b.counts,
      label: [when, lvl ? (b.uptime == null ? 'uptime not measured' : `${pct(b.uptime)} uptime`) : 'no data', lvl ? `worst: ${LEVEL_LABEL[lvl]}` : null, lat, b.message]
        .filter(Boolean)
        .join(', '),
      title: when,
      lines: [levelLine(b), ...(lat ? [lat] : []), ...(b.message ? [b.message] : [])],
    };
  });
}

/** The overview's 24-hour bar: one segment per hour. */
export function HourBar({ buckets, name }: { buckets: Bucket[]; name: string }) {
  const fmt = useBucketTime();
  return (
    <SegmentBar
      segments={bucketSegments(buckets, fmt, true)}
      name={name}
      unit="hours"
      phoneMax={24}
      startLabel={(n) => `${n} h ago`}
      endLabel="Now"
    />
  );
}
