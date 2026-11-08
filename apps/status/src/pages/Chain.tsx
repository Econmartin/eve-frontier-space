import type { ReactNode } from 'react';
import type { WorldDetails } from '../../shared/status.ts';
import { Address } from '../components/Layout.tsx';
import { StatusIcon } from '../components/Status.tsx';
import { API, relative, useFormatTime, useNow, usePoll } from '../lib.tsx';
import { Loading } from './Overview.tsx';

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1 border-t border-line py-2.5 first:border-t-0 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

const sui = (n: number | null) => (n == null ? '—' : `${n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(2)} SUI`);

function WorldPanel({ tenant }: { tenant: string }) {
  const { data, error } = usePoll<WorldDetails>(`${API}/worlds/${tenant}`, 30_000);
  const now = useNow(1000);
  const f = useFormatTime();
  if (!data) return <Loading error={error} />;
  const d = data;
  const mismatch = d.world_package && d.upstream_world_package && d.world_package !== d.upstream_world_package;
  return (
    <section aria-labelledby={`w-${tenant}`} className="rounded-xl bg-surface ring-1 ring-line p-4 sm:p-5">
      <h3 id={`w-${tenant}`} className="text-lg font-bold">
        {d.name}
      </h3>
      {mismatch && (
        <p className="mt-2 flex items-start gap-2 rounded-md bg-surface-2 p-3 text-sm" role="note">
          <StatusIcon level="degraded" className="mt-0.5" />
          <span className="break-all">
            The monitor checks {d.world_package}
            {d.pinned ? ' (pinned)' : ''}, but Published.toml lists {d.upstream_world_package}.
          </span>
        </p>
      )}
      <dl className="mt-3">
        <Row label="Tenant" hint="key.tenant of a Character object">
          <code>{tenant}</code>
        </Row>
        <Row label="World package" hint={`published-at, [published.testnet_${tenant}]`}>
          <Address value={d.world_package} label={`${d.name} world package`} />
        </Row>
        <Row label="EVE token package" hint="contracts/assets/Published.toml">
          <Address value={d.eve_token_package} label={`${d.name} EVE token package`} />
        </Row>
        <Row label="World start checkpoint" hint="checkpoint before the publish transaction">
          {d.world_start_checkpoint != null ? (
            <Address value={String(d.world_start_checkpoint)} kind="checkpoint" label="world start checkpoint">
              {d.world_start_checkpoint.toLocaleString('en-US')}
            </Address>
          ) : (
            '—'
          )}
        </Row>
        <Row label="Published">
          {d.published_at ? (
            <>
              {f.dateTime(d.published_at)}
              {d.publish_digest && (
                <span className="ml-2">
                  <Address value={d.publish_digest} kind="tx" label="publish transaction">
                    transaction
                  </Address>
                </span>
              )}
            </>
          ) : (
            '—'
          )}
        </Row>
        <Row label="Current checkpoint · epoch">
          {d.current_checkpoint != null ? (
            <>
              <Address value={String(d.current_checkpoint)} kind="checkpoint" label="current checkpoint">
                {d.current_checkpoint.toLocaleString('en-US')}
              </Address>{' '}
              · epoch {d.epoch ?? '—'}
            </>
          ) : (
            '—'
          )}
        </Row>
        <Row
          label="World transactions, last hour"
          hint={d.transactions_window_minutes < 55 ? `only ${d.transactions_window_minutes} min of samples so far` : 'calls to the world package'}
        >
          {d.transactions_last_hour?.toLocaleString('en-US') ?? '—'}
        </Row>
        <Row label="Last game server transaction" hint="newest world transaction paid by an authorised sponsor">
          {d.last_game_server_tx_at ? (
            <>
              <time dateTime={d.last_game_server_tx_at} title={f.dateTime(d.last_game_server_tx_at)}>
                {relative(d.last_game_server_tx_at, now)}
              </time>
              {d.last_game_server_tx_digest && (
                <span className="ml-2">
                  <Address value={d.last_game_server_tx_digest} kind="tx" label="last game server transaction">
                    transaction
                  </Address>
                </span>
              )}
            </>
          ) : (
            '—'
          )}
        </Row>
        <Row label="AdminACL">
          <Address value={d.admin_acl} label={`${d.name} AdminACL`} />
        </Row>
        <Row label="Authorised sponsors" hint="read from the AdminACL every minute">
          {d.sponsors.length ? (
            <ul className="space-y-2">
              {d.sponsors.map((s) => (
                <li key={s.address}>
                  <Address value={s.address} kind="account" label="sponsor" />
                  <span className="mt-0.5 block text-xs text-muted">
                    {sui(s.balance_sui)} · {s.active ? 'active in the last 24 h' : 'not seen paying in the last 24 h'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            '—'
          )}
        </Row>
        {d.world_api && (
          <Row label="World API">
            <a href={d.world_api + '/health'} className="break-all underline">
              {d.world_api}
            </a>
          </Row>
        )}
      </dl>
      <p className="mt-3 text-xs text-muted">Addresses resolved from Published.toml {relative(d.resolved_at, now)}; re-checked every six hours.</p>
    </section>
  );
}

export function ChainPage() {
  const worlds = usePoll<{ worlds: { tenant: string; name: string }[] }>(`${API}/worlds`, 0);
  if (!worlds.data) return <Loading error={worlds.error} />;
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Chain details</h2>
      {worlds.data.worlds.map((w) => (
        <WorldPanel key={w.tenant} tenant={w.tenant} />
      ))}
    </div>
  );
}
