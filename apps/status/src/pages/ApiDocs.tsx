import { useState } from 'react';

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://evefrontier.space';
const now = '2026-11-08T09:24:06.916Z';

// Example responses, trimmed. Taken from a real run on 8 Nov 2026.
const ROUTES: { path: string; title: string; about: string; example: unknown }[] = [
  {
    path: '/status/api/v1/summary',
    title: 'Summary',
    about: 'Overall status and every component’s current status.',
    example: {
      generated_at: now,
      stale: false,
      status: 'operational',
      description: 'All systems operational',
      counts: { operational: 9, degraded: 0, offline: 0, maintenance: 0, unknown: 0 },
      last_sample_at: '2026-11-08T09:23:39.896Z',
      groups: [
        {
          name: 'Stillness',
          components: [
            {
              id: 'stillness-game-server',
              group: 'Stillness',
              world: 'stillness',
              name: 'Game server',
              description: 'Age of the newest world transaction paid for by an authorised sponsor…',
              status: 'operational',
              message: 'Last sponsored transaction 55 s ago',
              checked_at: '2026-11-08T09:23:39.896Z',
              latency_ms: null,
            },
          ],
        },
      ],
    },
  },
  {
    path: '/status/api/v1/components/stillness-game-server',
    title: 'One component',
    about: 'The component with its last 90 daily rollups (UTC days, oldest first).',
    example: {
      generated_at: now,
      stale: false,
      component: { id: 'stillness-game-server', status: 'operational', message: 'Last sponsored transaction 55 s ago' },
      days: [{ date: '2026-11-08', uptime: 1, worst: 'operational', counts: { operational: 563, degraded: 0, offline: 0, maintenance: 0, unknown: 2 }, incident_ids: [] }],
    },
  },
  {
    path: '/status/api/v1/components/sui-graphql/samples?range=1h',
    title: 'Recent samples',
    about: 'The one-minute checks in fixed buckets: range=1h (per minute), 6h (per 5 min), 24h (per 15 min) or 7d (per hour).',
    example: {
      generated_at: now,
      stale: false,
      component: 'sui-graphql',
      range: '1h',
      bucket_minutes: 1,
      buckets: [
        {
          start: '2026-11-08T09:23:00.000Z',
          minutes: 1,
          counts: { operational: 1, degraded: 0, offline: 0, maintenance: 0, unknown: 0 },
          uptime: 1,
          worst: 'operational',
          latency_ms: 127,
          message: 'Answered in 127 ms',
        },
      ],
    },
  },
  {
    path: '/status/api/v1/worlds/stillness',
    title: 'World chain details',
    about: 'The chain panel as JSON. Addresses are lowercase, balances in SUI.',
    example: {
      generated_at: now,
      stale: false,
      tenant: 'stillness',
      name: 'Stillness',
      world_package: '0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92',
      upstream_world_package: '0x7be18d6294e533bedd9a5d70a96ce8d9d4b87a7c74188ba65d3fe966bbed9d92',
      pinned: false,
      eve_token_package: '0xc663658ff707985246bc7b5c605a458ec2caea28bfc35c253eb526dcf961643e',
      world_start_checkpoint: 387251154,
      published_at: '2026-09-24T13:57:04.699Z',
      current_checkpoint: 404153347,
      epoch: 1277,
      transactions_last_hour: 412,
      transactions_window_minutes: 60,
      last_game_server_tx_at: '2026-11-08T09:22:45.484Z',
      admin_acl: '0xcb4f47804533a80b3854b33b37514ff03b1d7a4debad84bacdbe9fed5bfbf34f',
      sponsors: [{ address: '0xf60a44ce65b325ab3e4d76b09a86acba380bbd3cf1dbedbbff5d812acdc72e4f', balance_sui: 1732.28, active: true }],
    },
  },
  {
    path: '/status/api/v1/incidents?status=open',
    title: 'Incidents',
    about: 'Incidents with their updates, newest first. status is open or resolved; omit it for both. limit up to 200.',
    example: {
      generated_at: now,
      stale: false,
      incidents: [
        {
          id: 12,
          component: 'utopia-game-server',
          component_name: 'Utopia Game server',
          title: 'Utopia Game server offline',
          impact: 'offline',
          status: 'open',
          started_at: '2026-11-08T10:47:00.000Z',
          resolved_at: null,
          automatic: true,
          updates: [{ id: 31, at: '2026-11-08T10:47:00.000Z', kind: 'detected', author: 'monitor', body: 'Detected automatically after 3 failed checks in a row: Last sponsored transaction 47 min ago' }],
        },
      ],
    },
  },
  {
    path: '/status/api/v1/history?component=sui-checkpoints&days=90',
    title: 'History',
    about: 'Daily rollups. Leave out component for every component. days from 1 to 400 (default 90).',
    example: { generated_at: now, stale: false, days: 90, history: { 'sui-checkpoints': [{ date: '2026-08-11', uptime: null, worst: null, counts: { operational: 0, degraded: 0, offline: 0, maintenance: 0, unknown: 0 }, incident_ids: [] }] } },
  },
  {
    path: '/status/api/v1/worlds/stillness/gaps?days=14',
    title: 'Heartbeat gaps',
    about: 'Distribution of gaps between sponsored world transactions, for re-tuning the game server thresholds.',
    example: { generated_at: now, stale: false, tenant: 'stillness', days_with_data: 1, gaps: 412, p50_sec: 5, p99_sec: 120, p999_sec: 300, max_sec: 341.2, thresholds: { degradedAfterSec: 600, offlineAfterSec: 1200 }, suggested: null },
  },
];

function Example({ r }: { r: (typeof ROUTES)[number] }) {
  const [live, setLive] = useState<string | null>(null);
  return (
    <section aria-labelledby={`r-${r.title}`} className="rounded-xl bg-surface ring-1 ring-line p-4 sm:p-5">
      <h3 id={`r-${r.title}`} className="font-bold">
        {r.title}
      </h3>
      <p className="mt-1 text-sm text-muted">{r.about}</p>
      <p className="mt-3 overflow-x-auto text-sm">
        <code className="whitespace-nowrap rounded bg-surface-2 px-2 py-1">GET {r.path}</code>
      </p>
      <div className="mt-3 flex gap-3 text-xs">
        <button
          type="button"
          className="underline"
          onClick={async () => {
            try {
              const res = await fetch(r.path);
              setLive(JSON.stringify(await res.json(), null, 2));
            } catch (e) {
              setLive(String(e));
            }
          }}
        >
          Show the live response
        </button>
        {live && (
          <button type="button" className="underline" onClick={() => setLive(null)}>
            Show the example
          </button>
        )}
      </div>
      <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-surface-2 p-3 text-xs" tabIndex={0} aria-label={`${live ? 'Live' : 'Example'} response for ${r.title}`}>
        {live ?? JSON.stringify(r.example, null, 2)}
      </pre>
    </section>
  );
}

export function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Public API</h2>
        <div className="mt-2 max-w-prose space-y-2 text-sm">
          <p>
            Read-only JSON under <code>{ORIGIN}/status/api/v1</code>. Any origin may call it (CORS <code>*</code>). Responses are cached at the edge for 30 seconds, and
            each address may make 60 requests a minute.
          </p>
          <p>
            Every response has <code>generated_at</code> (UTC, ISO 8601) and <code>stale</code>, which is <code>true</code> when the newest sample is more than 3 minutes
            old. <code>unknown</code> means our own probe could not measure something; it never means the thing is down.
          </p>
          <p>
            Full description: <a href="/status/openapi.yaml" className="underline">OpenAPI file</a>. Incidents are also an <a href="/status/feeds/incidents.rss" className="underline">RSS feed</a>.
          </p>
        </div>
      </div>
      {ROUTES.map((r) => (
        <Example key={r.path} r={r} />
      ))}
      <section aria-labelledby="webhooks" className="rounded-xl bg-surface ring-1 ring-line p-4 text-sm sm:p-5">
        <h3 id="webhooks" className="font-bold">
          Webhooks
        </h3>
        <p className="mt-1 text-muted">
          <code>POST /status/api/v1/subscriptions</code> with <code>{'{"url":"https://…"}'}</code> as JSON. We first POST{' '}
          <code>{'{"type":"subscription.verify","challenge":"…"}'}</code> to your URL, and it must reply 2xx with the challenge in the body; only then is it stored and you
          get an id and a secret (shown once). Each delivery is a POST of <code>{'{type, created_at, data, source}'}</code> with <code>X-Status-Timestamp</code>,{' '}
          <code>X-Status-Delivery</code> and <code>X-Status-Signature: sha256=HMAC(secret, "&lt;timestamp&gt;.&lt;body&gt;")</code>: check it, and reject anything older
          than 5 minutes or a delivery ID you have seen. Types: incident.opened, incident.updated, incident.resolved, world.redeployed, world.upgraded. Unsubscribe with{' '}
          <code>DELETE /status/api/v1/subscriptions/&lt;id&gt;</code> and <code>Authorization: Bearer &lt;secret&gt;</code>.
        </p>
      </section>
    </div>
  );
}
