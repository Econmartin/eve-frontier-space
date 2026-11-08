import { Link } from 'react-router';
import { LEVEL_LABEL, type ComponentStatus, type Incident, type WorldEvent } from '../../shared/status.ts';
import { StatusIcon } from '../components/Status.tsx';
import { API, useFormatTime, usePoll } from '../lib.tsx';
import { Loading } from './Overview.tsx';

function duration(a: string, b: string | null) {
  const ms = (b ? Date.parse(b) : Date.now()) - Date.parse(a);
  const m = Math.round(ms / 60_000);
  if (m < 90) return `${m} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export function IncidentCard({ i, level = 3 }: { i: Incident; level?: 3 | 4 | 5 }) {
  const f = useFormatTime();
  const H = `h${level}` as 'h3';
  return (
    <article id={`incident-${i.id}`} className="rounded-xl bg-surface ring-1 ring-line p-4 sm:p-5" aria-labelledby={`incident-${i.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <H id={`incident-${i.id}-title`} className="flex items-center gap-2 font-bold">
          <StatusIcon level={i.status === 'resolved' ? 'operational' : i.impact} />
          {i.title}
        </H>
        <span className="text-xs font-bold">{i.status === 'resolved' ? 'Resolved' : `Open · ${LEVEL_LABEL[i.impact]}`}</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        <Link to={`/history/${i.component}`} className="underline">
          {i.component_name}
        </Link>{' '}
        · started {f.dateTime(i.started_at)}
        {i.resolved_at ? ` · resolved ${f.dateTime(i.resolved_at)}` : ''} · {duration(i.started_at, i.resolved_at)}
        {i.automatic ? ' · detected automatically' : ''}
      </p>
      <ol className="mt-3 space-y-2 border-l-2 border-line pl-3 text-sm">
        {i.updates.map((u) => (
          <li key={u.id}>
            <span className="font-bold capitalize">{u.kind}</span> <span className="text-xs text-muted">{f.dateTime(u.at)} · {u.author === 'admin' ? 'written update' : 'monitor'}</span>
            <p className="mt-0.5 whitespace-pre-line break-words">{u.body}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function HistoryPage() {
  const resolved = usePoll<{ incidents: Incident[] }>(`${API}/incidents?status=resolved&limit=200`, 300_000);
  const events = usePoll<{ events: WorldEvent[] }>(`${API}/events`, 300_000);
  const comps = usePoll<{ components: ComponentStatus[] }>(`${API}/components`, 0);
  const f = useFormatTime();
  if (!resolved.data) return <Loading error={resolved.error} />;
  const byMonth = new Map<string, Incident[]>();
  for (const i of resolved.data.incidents) {
    const k = new Date(i.started_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: f.mode === 'utc' ? 'UTC' : undefined });
    byMonth.set(k, [...(byMonth.get(k) ?? []), i]);
  }
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">History</h2>
      <nav aria-label="Component history" className="rounded-xl bg-surface ring-1 ring-line p-4 text-sm">
        <h3 className="mb-2 font-bold">Components</h3>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {(comps.data?.components ?? []).map((c) => (
            <li key={c.id}>
              <Link to={`/history/${c.id}`} className="underline">
                {c.group} · {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <section aria-labelledby="past" className="space-y-4">
        <h3 id="past" className="text-base font-bold">
          Resolved incidents
        </h3>
        {byMonth.size === 0 && <p className="text-sm text-muted">No resolved incidents yet.</p>}
        {[...byMonth].map(([month, list]) => (
          <div key={month} className="space-y-3">
            <h4 className="text-sm font-bold text-muted">{month}</h4>
            {list.map((i) => (
              <IncidentCard key={i.id} i={i} level={5} />
            ))}
          </div>
        ))}
      </section>
      <section aria-labelledby="events" className="space-y-3">
        <h3 id="events" className="text-base font-bold">
          World redeploys
        </h3>
        {(events.data?.events ?? []).length === 0 && <p className="text-sm text-muted">None recorded since monitoring began.</p>}
        <ul className="space-y-2">
          {(events.data?.events ?? []).map((e) => (
            <li key={e.id} className="rounded-xl bg-surface ring-1 ring-line p-4 text-sm">
              <p className="font-bold">
                {e.kind === 'world_redeployed' ? 'World redeployed' : 'World upgraded'} · {f.dateTime(e.at)}
              </p>
              <p className="mt-1 break-all text-muted">{e.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
