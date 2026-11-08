import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LEVEL_LABEL, LEVELS, worst, type Bucket, type ComponentStatus, type DayRollup, type Incident, type Reconstructed, type Summary, type WorldEvent } from '../../shared/status.ts';
import { Subscribe } from '../components/Layout.tsx';
import { Legend, StatusIcon, StatusLabel } from '../components/Status.tsx';
import { HourBar, UptimeBar } from '../components/UptimeBar.tsx';
import { API, relative, useFormatTime, useNow, usePoll } from '../lib.tsx';
import { IncidentCard } from './History.tsx';

export function useStatusData() {
  const summary = usePoll<Summary>(`${API}/summary`);
  const history = usePoll<{ history: Record<string, DayRollup[]>; reconstructed: Reconstructed | null }>(`${API}/history?days=90`, 300_000);
  const incidents = usePoll<{ incidents: Incident[] }>(`${API}/incidents?limit=200`);
  const incidentMap = new Map((incidents.data?.incidents ?? []).map((i) => [i.id, i]));
  return { summary, history, incidents, incidentMap };
}

function Banner({ s, incidents }: { s: Summary; incidents: Incident[] | null }) {
  const now = useNow(5000);
  const f = useFormatTime();
  const counts = LEVELS.filter((l) => s.counts[l] > 0);
  return (
    <section aria-labelledby="overall" className="rounded-xl bg-surface ring-1 ring-line p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <StatusIcon level={s.stale ? 'unknown' : s.status} size={30} className="mt-0.5" />
          <div className="min-w-0">
            <h2 id="overall" className="text-xl font-bold sm:text-2xl">
              {s.stale ? 'Status may be out of date' : s.description}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Overall: <span className="font-bold">{LEVEL_LABEL[s.status]}</span> · Last checked{' '}
              <time dateTime={s.last_sample_at ?? undefined} title={f.dateTime(s.last_sample_at)}>
                {relative(s.last_sample_at, now)}
              </time>
            </p>
          </div>
        </div>
        <Subscribe />
      </div>
      <Last24h incidents={incidents} />
      {s.stale && (
        <p role="alert" className="mt-4 flex items-center gap-2 rounded-md bg-surface-2 p-3 text-sm">
          <StatusIcon level="unknown" />
          The monitor has not reported for more than 3 minutes. Everything below is the last known state.
        </p>
      )}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Components by status">
        {counts.map((l) => (
          <li key={l} className="inline-flex items-center gap-1.5">
            <StatusIcon level={l} size={15} />
            <span className="font-bold">{s.counts[l]}</span> {LEVEL_LABEL[l]}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One line answering "was anything down in the last 24 hours?", from the incidents that overlapped that window. */
function Last24h({ incidents }: { incidents: Incident[] | null }) {
  const f = useFormatTime();
  if (!incidents) return null;
  const since = Date.now() - 24 * 3600_000;
  const hits = incidents
    .filter((i) => i.status === 'open' || Date.parse(i.resolved_at ?? i.started_at) >= since)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
  const span = (i: Incident) => {
    const mins = Math.max(1, Math.round(((i.resolved_at ? Date.parse(i.resolved_at) : Date.now()) - Date.parse(i.started_at)) / 60_000));
    const dur = mins < 90 ? `${mins} min` : `${(mins / 60).toFixed(1)} h`;
    return `${f.time(i.started_at).replace(/:\d\d( UTC)?$/, '$1')}${i.resolved_at ? '' : ', ongoing'} (${dur})`;
  };
  return (
    <p className="mt-4 text-sm">
      <span className="font-bold">Last 24 hours: </span>
      {hits.length === 0 ? (
        'no incidents.'
      ) : (
        <>
          {hits.slice(0, 3).map((i, n) => (
            <span key={i.id}>
              {n > 0 && '; '}
              <Link to={`/history/${i.component}?range=24h`} className="underline">
                {i.title}
              </Link>{' '}
              at {span(i)}
            </span>
          ))}
          {hits.length > 3 && (
            <>
              {' '}
              and{' '}
              <Link to="/history" className="underline">
                {hits.length - 3} more
              </Link>
            </>
          )}
          .
        </>
      )}
    </p>
  );
}

function ComponentRow({ c, days, hours, incidents }: { c: ComponentStatus; days: DayRollup[] | undefined; hours: Bucket[] | undefined | null; incidents: Map<number, Incident> }) {
  return (
    <li className="border-t border-line px-4 py-4 first:border-t-0 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <Link to={`/history/${c.id}`} className="font-bold underline decoration-line hover:decoration-text">
            {c.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted">{c.message}</p>
        </div>
        <StatusLabel level={c.status} className="text-sm" />
      </div>
      <details className="mt-1 text-xs text-muted">
        <summary className="cursor-pointer select-none">What is checked</summary>
        <p className="mt-1 max-w-prose">{c.description}</p>
      </details>
      <div className="mt-3">
        {hours !== null ? (
          hours ? <HourBar buckets={hours} name={`${c.group} ${c.name}`} /> : <div className="h-8 rounded bg-surface-2">
            <span className="sr-only">Loading</span>
          </div>
        ) : days ? (
          <UptimeBar days={days} name={`${c.group} ${c.name}`} incidents={incidents} />
        ) : (
          <div className="h-8 rounded bg-surface-2">
            <span className="sr-only">Loading</span>
          </div>
        )}
      </div>
    </li>
  );
}

export function Groups({
  s,
  history,
  recent,
  incidents,
}: {
  s: Summary;
  history: Record<string, DayRollup[]> | undefined;
  /** null in the 90-day view; undefined while the 24-hour data loads */
  recent: Record<string, Bucket[]> | undefined | null;
  incidents: Map<number, Incident>;
}) {
  return (
    <div className="space-y-6">
      {s.groups.map((g) => {
        const w = worst(g.components.map((c) => c.status));
        return (
          <section key={g.name} aria-labelledby={`g-${g.name}`} className="rounded-xl bg-surface ring-1 ring-line">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <h3 id={`g-${g.name}`} className="text-base font-bold">
                {g.name}
              </h3>
              <StatusLabel level={w} className="text-sm" />
            </div>
            <ul>
              {g.components.map((c) => (
                <ComponentRow key={c.id} c={c} days={history?.[c.id]} hours={recent === null ? null : recent?.[c.id]} incidents={incidents} />
              ))}
            </ul>
            {g.name === 'Utopia' && (
              <p className="border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
                Utopia's World API is not monitored: its old host no longer resolves and no replacement is published.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function OverviewPage() {
  const { summary, history, incidents, incidentMap } = useStatusData();
  const events = usePoll<{ events: WorldEvent[] }>(`${API}/events`, 300_000);
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === '24h' ? '24h' : '90d';
  const recent = usePoll<{ components: Record<string, Bucket[]> }>(view === '24h' ? `${API}/recent` : null);
  const f = useFormatTime();
  const s = summary.data;
  // Speak only when something changes: the overall status, or a refresh failing (WCAG 4.1.3). Not on every poll.
  const [announce, setAnnounce] = useState('');
  const prev = useRef<string | null>(null);
  const statusKey = s ? `${s.status}|${s.description}` : null;
  useEffect(() => {
    if (!statusKey || !s) return;
    if (prev.current && prev.current !== statusKey) setAnnounce(`Status changed: ${s.description}`);
    prev.current = statusKey;
  }, [statusKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const refreshFailed = !!(s && summary.error);
  useEffect(() => {
    if (refreshFailed) setAnnounce('Could not refresh the status. Showing the last data received.');
  }, [refreshFailed]);
  if (!s) return <Loading error={summary.error} />;
  const open = (incidents.data?.incidents ?? []).filter((i) => i.status === 'open');
  const recentEvents = (events.data?.events ?? []).filter((e) => Date.now() - Date.parse(e.at) < 72 * 3600_000);
  return (
    <div className="space-y-6">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      {refreshFailed && (
        <p className="flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2 text-sm">
          <StatusIcon level="unknown" /> Could not refresh just now ({summary.error}). Showing the last data received; trying again every minute.
        </p>
      )}
      <Banner s={s} incidents={incidents.data?.incidents ?? null} />
      {recentEvents.map((e) => (
        <aside key={e.id} className="rounded-xl border border-maintenance/50 bg-surface p-4 text-sm" aria-label="World redeploy notice">
          <p className="flex items-center gap-2 font-bold">
            <StatusIcon level="maintenance" /> {e.kind === 'world_redeployed' ? 'World redeployed' : 'World upgraded'} · {f.dateTime(e.at)}
          </p>
          <p className="mt-1 break-all text-muted">{e.body}</p>
        </aside>
      ))}
      {open.length > 0 && (
        <section aria-labelledby="open-incidents" className="space-y-3">
          <h2 id="open-incidents" className="text-base font-bold">
            Open incidents
          </h2>
          {open.map((i) => (
            <IncidentCard key={i.id} i={i} />
          ))}
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold">Components</h2>
        <ViewSwitch view={view} onChange={(v) => setParams(v === '90d' ? {} : { view: v }, { replace: true })} />
      </div>
      <Groups s={s} history={history.data?.history} recent={view === '24h' ? recent.data?.components : null} incidents={incidentMap} />
      <Legend />
      <ReconstructedNote r={history.data?.reconstructed ?? null} s={s} />
    </div>
  );
}

/** Says which bars before live monitoring began were rebuilt from the chain, and that the rest have no data then. */
export function ReconstructedNote({ r, s, only }: { r: Reconstructed | null; s?: Summary; only?: string }) {
  const f = useFormatTime();
  if (!r) return null;
  if (only && !r.components.includes(only)) {
    return <p className="text-xs text-muted">Live monitoring began {f.dateTime(r.to)}; there is no data for this component before then.</p>;
  }
  const names = s
    ? s.groups.flatMap((g) => g.components.filter((c) => r.components.includes(c.id)).map((c) => `${c.world ? g.name + ' ' : ''}${c.name.toLowerCase()}`))
    : [];
  return (
    <p className="text-xs text-muted">
      Live monitoring began {f.dateTime(r.to)}. Before that, {only ? 'this history is' : `${names.join(', ')} history is`} reconstructed from the Sui testnet
      chain (checkpoint timestamps and sponsored world transactions) back to {f.dateTime(r.from)}, using the same thresholds and incident rules
      {only ? '' : '; the other components have no data before live monitoring began'}.
    </p>
  );
}

function ViewSwitch({ view, onChange }: { view: '90d' | '24h'; onChange: (v: '90d' | '24h') => void }) {
  return (
    <div role="group" aria-label="Uptime bars show" className="inline-flex rounded-xl bg-surface p-1 text-xs ring-1 ring-line">
      {(
        [
          ['90d', '90 days'],
          ['24h', '24 hours'],
        ] as const
      ).map(([k, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={view === k}
          onClick={() => onChange(k)}
          className={`rounded-lg px-3 py-1.5 font-semibold tracking-wide uppercase ${view === k ? 'bg-text text-bg' : 'text-muted hover:text-text'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Loading({ error }: { error: string | null }) {
  return (
    <div role="status" className="rounded-xl bg-surface ring-1 ring-line p-6 text-sm text-muted">
      {error ? `Could not load status: ${error}` : 'Loading status…'}
    </div>
  );
}
