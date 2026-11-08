import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { RANGES, type Bucket, type ComponentStatus, type DayRollup, type Incident, type RangeKey } from '../../shared/status.ts';
import { Legend, StatusLabel } from '../components/Status.tsx';
import { bucketSegments, dayLevel, SegmentBar, UptimeBar, useBucketTime } from '../components/UptimeBar.tsx';
import { API, formatDay, pct, useFormatTime, usePoll } from '../lib.tsx';
import { IncidentCard } from './History.tsx';
import { Loading } from './Overview.tsx';

type View = RangeKey | '90d';
const VIEWS: { key: View; label: string; detail: string }[] = [
  { key: '1h', label: '1 h', detail: 'last hour, one segment per minute' },
  { key: '6h', label: '6 h', detail: 'last 6 hours, per 5 minutes' },
  { key: '24h', label: '24 h', detail: 'last 24 hours, per 15 minutes' },
  { key: '7d', label: '7 d', detail: 'last 7 days, per hour' },
  { key: '90d', label: '90 d', detail: 'last 90 days, per day (UTC)' },
];
const isView = (v: string | null): v is View => VIEWS.some((x) => x.key === v);

export const ago = (minutes: number) => (minutes < 120 ? `${minutes} min ago` : minutes < 2880 ? `${Math.round(minutes / 60)} h ago` : `${Math.round(minutes / 1440)} days ago`);

/** Tabs for the time range: arrow keys move and select, as in the WAI-ARIA tabs pattern. */
function RangeTabs({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % VIEWS.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + VIEWS.length) % VIEWS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = VIEWS.length - 1;
    else return;
    e.preventDefault();
    onChange(VIEWS[n].key);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" aria-label="Time range" className="inline-flex flex-wrap rounded-xl bg-bg p-1 text-xs ring-1 ring-line">
      {VIEWS.map((v, i) => (
        <button
          key={v.key}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={`tab-${v.key}`}
          role="tab"
          type="button"
          aria-selected={view === v.key}
          aria-controls="range-panel"
          tabIndex={view === v.key ? 0 : -1}
          title={v.detail}
          onClick={() => onChange(v.key)}
          onKeyDown={(e) => onKey(e, i)}
          className={`rounded-lg px-3 py-1.5 font-semibold tracking-wide uppercase ${view === v.key ? 'bg-text text-bg' : 'text-muted hover:text-text'}`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function ProblemsToggle({ on, set, count }: { on: boolean; set: (v: boolean) => void; count: number }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-[var(--text)]" />
      Only problems <span className="text-muted">({count})</span>
    </label>
  );
}

const isProblem = (lvl: ReturnType<typeof dayLevel>) => lvl === 'degraded' || lvl === 'offline' || lvl === 'maintenance' || lvl === 'unknown';

function BucketView({ c, range }: { c: ComponentStatus; range: RangeKey }) {
  const r = RANGES[range];
  const { data, error } = usePoll<{ buckets: Bucket[] }>(`${API}/components/${c.id}/samples?range=${range}`, range === '1h' ? 60_000 : 300_000);
  const fmt = useBucketTime();
  const [problems, setProblems] = useState(false);
  if (!data) return <Loading error={error} />;
  const withDay = range === '24h' || range === '7d';
  const segments = bucketSegments(data.buckets, fmt, withDay);
  const hasLatency = data.buckets.some((b) => b.latency_ms != null);
  const rows = [...data.buckets].reverse();
  const problemCount = rows.filter((b) => isProblem(dayLevel(b))).length;
  const visible = problems ? rows.filter((b) => isProblem(dayLevel(b))) : rows;
  return (
    <>
      <SegmentBar
        segments={segments}
        name={`${c.group} ${c.name}`}
        unit={r.bucketMinutes === 1 ? 'minutes' : r.bucketMinutes === 60 ? 'hours' : `${r.bucketMinutes}-minute periods`}
        phoneMax={60}
        startLabel={(n) => ago(n * r.bucketMinutes)}
        endLabel="Now"
      />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold">{r.bucketMinutes === 1 ? 'Every check' : `Per ${r.bucketMinutes === 60 ? 'hour' : `${r.bucketMinutes} minutes`}`}</h4>
        <ProblemsToggle on={problems} set={setProblems} count={problemCount} />
      </div>
      <Table caption={`${c.name}, ${VIEWS.find((v) => v.key === range)!.detail}, newest first`} empty={problems ? 'No problems in this range.' : 'No samples yet.'} isEmpty={!visible.length}>
        <thead>
          <tr>
            <Th>Time</Th>
            <Th>Status</Th>
            {r.bucketMinutes > 1 && <Th>Uptime</Th>}
            {hasLatency && <Th>Latency</Th>}
            <Th>Details</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((b) => {
            const lvl = dayLevel(b);
            return (
              <tr key={b.start} className="border-t border-line align-top">
                <Td className="whitespace-nowrap">{fmt(b, withDay)}</Td>
                <Td className="whitespace-nowrap">{lvl ? <StatusLabel level={lvl} className="font-normal" /> : <span className="text-muted">No data</span>}</Td>
                {r.bucketMinutes > 1 && <Td>{pct(b.uptime)}</Td>}
                {hasLatency && <Td className="whitespace-nowrap">{b.latency_ms != null ? `${b.latency_ms} ms` : '—'}</Td>}
                <Td className="min-w-[14rem] text-muted">{b.message ?? (lvl ? '' : '—')}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}

function DayView({ c, days, incidents }: { c: ComponentStatus; days: DayRollup[]; incidents: Map<number, Incident> }) {
  const [problems, setProblems] = useState(false);
  const rows = [...days].reverse();
  const problemCount = rows.filter((d) => isProblem(dayLevel(d)) || d.incident_ids.length).length;
  const visible = problems ? rows.filter((d) => isProblem(dayLevel(d)) || d.incident_ids.length) : rows;
  return (
    <>
      <UptimeBar days={days} name={`${c.group} ${c.name}`} incidents={incidents} />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold">Per day</h4>
        <ProblemsToggle on={problems} set={setProblems} count={problemCount} />
      </div>
      <Table caption={`Daily uptime for ${c.name}, newest first; days are UTC`} empty="No problem days in the last 90 days." isEmpty={!visible.length}>
        <thead>
          <tr>
            <Th>Day (UTC)</Th>
            <Th>Uptime</Th>
            <Th>Worst</Th>
            <Th>Incidents</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((d) => {
            const l = dayLevel(d);
            return (
              <tr key={d.date} className="border-t border-line">
                <Td className="whitespace-nowrap">{formatDay(d.date)}</Td>
                <Td>{pct(d.uptime)}</Td>
                <Td>{l ? <StatusLabel level={l} className="font-normal" /> : <span className="text-muted">No data</span>}</Td>
                <Td>
                  {d.incident_ids.length
                    ? d.incident_ids.map((x) => (
                        <a key={x} href={`#incident-${x}`} className="mr-2 underline">
                          #{x}
                        </a>
                      ))
                    : '—'}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}

function Table({ caption, empty, isEmpty, children }: { caption: string; empty: string; isEmpty: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-2 max-h-[30rem] overflow-auto rounded-xl ring-1 ring-line" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full text-left font-mono text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
      {isEmpty && <p className="p-3 text-sm text-muted">{empty}</p>}
    </div>
  );
}
const Th = ({ children }: { children: React.ReactNode }) => (
  <th scope="col" className="sticky top-0 bg-surface-2 px-3 py-1.5 text-xs font-normal text-muted">
    {children}
  </th>
);
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <td className={`px-3 py-1.5 ${className}`}>{children}</td>;

export function ComponentPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const view: View = isView(params.get('range')) ? (params.get('range') as View) : '24h';
  const comp = usePoll<{ component: ComponentStatus; days: DayRollup[] }>(`${API}/components/${id}`);
  const incs = usePoll<{ incidents: Incident[] }>(`${API}/incidents?limit=200`);
  useFormatTime(); // re-render on the UTC/local toggle
  const title = comp.data ? `${comp.data.component.group} ${comp.data.component.name}` : 'Component';
  useEffect(() => {
    document.title = `${title} · EVE Frontier Status`;
  }, [title]);
  if (!comp.data) return <Loading error={comp.error} />;
  const c = comp.data.component;
  const mine = (incs.data?.incidents ?? []).filter((i) => i.component === c.id);
  const map = new Map(mine.map((i) => [i.id, i]));
  const setView = (v: View) => setParams(v === '24h' ? {} : { range: v }, { replace: true });
  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link to="/history" className="underline">
          History
        </Link>{' '}
        / {c.group}
      </p>
      <section className="rounded-xl bg-surface ring-1 ring-line p-5" aria-labelledby="cname">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="cname" className="text-xl font-bold">
              {c.group} · {c.name}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted">{c.description}</p>
          </div>
          <StatusLabel level={c.status} />
        </div>
        <p className="mt-3 text-sm">{c.message}</p>
      </section>
      <section className="rounded-xl bg-surface ring-1 ring-line p-5" aria-labelledby="range-h">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 id="range-h" className="font-bold">
            Uptime
          </h3>
          <RangeTabs view={view} onChange={setView} />
        </div>
        <div id="range-panel" role="tabpanel" aria-labelledby={`tab-${view}`}>
          <p className="mb-8 text-xs text-muted">Showing the {VIEWS.find((v) => v.key === view)!.detail}. Checks run once a minute.</p>
          {view === '90d' ? <DayView c={c} days={comp.data.days} incidents={map} /> : <BucketView key={view} c={c} range={view} />}
          <div className="mt-4">
            <Legend />
          </div>
        </div>
      </section>
      <section aria-labelledby="cinc" className="space-y-3">
        <h3 id="cinc" className="font-bold">
          Incidents
        </h3>
        {mine.length === 0 && <p className="text-sm text-muted">No incidents for this component.</p>}
        {mine.map((i) => (
          <IncidentCard key={i.id} i={i} level={4} />
        ))}
      </section>
    </div>
  );
}
